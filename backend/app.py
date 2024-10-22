from fastapi import FastAPI
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from presidio_analyzer import AnalyzerEngine, PatternRecognizer
from presidio_analyzer.pattern import Pattern
from dotenv import load_dotenv
import os
import configparser
import json
import re
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate, FewShotPromptTemplate
from langchain_openai import ChatOpenAI
from langchain.output_parsers import PydanticOutputParser
from concurrent.futures import ThreadPoolExecutor
from gemini_privacy_policy import gemini_policy
from gpt_privacy_policy import gpt_policy

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CheckContext(BaseModel):
    context: str

# Define a pattern for recognizing full addresses
full_address_pattern = Pattern(
    name="full_address",
    regex=r"\b\d+\s+\w+\s+(?:St\.|Street|Rd\.|Road|Ave\.|Avenue|Blvd\.|Boulevard|Ln\.|Lane|Dr\.|Drive|Ct\.|Court)\b,?\s*\w+(?:\s\w+)*,?\s*[A-Z]{2}(?:\s*\d{5})?\b",
    score=0.8
)

# Define a pattern for recognizing credit card numbers
credit_card_pattern = Pattern(
    name="credit_card",
    regex=r"\b(?:\d[ -]*?){13,16}\b",
    score=0.9
)

# Create custom recognizers using the defined patterns
full_address_recognizer = PatternRecognizer(supported_entity="ADDRESS", patterns=[full_address_pattern])
credit_card_recognizer = PatternRecognizer(supported_entity="CREDIT_CARD", patterns=[credit_card_pattern])

# Initialize the AnalyzerEngine and add the custom recognizers
analyzer = AnalyzerEngine()
analyzer.registry.add_recognizer(full_address_recognizer)
analyzer.registry.add_recognizer(credit_card_recognizer)

@app.post("/getContext")
async def get_context(context: CheckContext):
    print(context)
    results = analyzer.analyze(
        text=context.context, 
        entities=["CREDIT_CARD", "PHONE_NUMBER", "ADDRESS"], 
        language="en"
    )
    sensitive_info = [
        {
            "entity_type": result.entity_type, 
            "start": result.start, 
            "end": result.end, 
            "score": result.score,
            "text": context.context[result.start:result.end]
        } 
        for result in results
    ]
    print(sensitive_info)
    return {"message": "Context received", "sensitive_info": sensitive_info}



current_file_path = os.path.abspath(__file__)
current_dir_path = os.path.dirname(current_file_path)
config = configparser.ConfigParser()
config.read(os.path.join(current_dir_path, 'config.ini'))
os.environ['OPENAI_API_KEY'] = config['DEFAULT']['OPENAI_API_KEY']

with open(os.path.join(current_dir_path, './prompts.json')) as prompts_file:
    prompts = json.load(prompts_file)

with open(os.path.join(current_dir_path, './examples.json')) as examples_file:
    fewshot_examples = json.load(examples_file)

with open(os.path.join(current_dir_path, './knowledge.json')) as knowledge_file:
    knowledge = json.load(knowledge_file)

# explanation: str=Field(description='Who will access the data for what purpose')
class FactInfo(BaseModel):
    fact: str = Field(description='Cite a sentence from the privacy policy')
    accessor: str = Field(description='Who will access the data (service provider and third parties). Each data accesor should be different.')
    reason: str = Field(description='Why access the data')

class Facts(BaseModel):
    facts: list[FactInfo]

class RiskInfo(BaseModel):
    risk: str = Field(description='A potential privacy risk consequence based on the privacy policy and privacy knowledge, return what users will encounter')
    risk_type: str = Field(description='One of the privacy risks: Surveillance, Identification, Aggregation, Phrenology / Physiognomy, Secondary use, Exclusion, Insecurity, Exposure, Distortion, Disclosure, Increased Accessibility, Intrusion.')
    explanation: str=Field(description='A simple and brief related knowledge about privacy risks for LLM, and why they can get access to the data')

class Risks(BaseModel):
    risks: list[RiskInfo]

class SemanticMatch(BaseModel):
    matched_part: str = Field(description='The keywords or phrases related with the given sensitive information.')

class checkRequest(BaseModel):
    sensitive: str
    policy: str


def semantic_match(sentence, sensitiveInfo):
    match_parser = PydanticOutputParser(pydantic_object=SemanticMatch)
    example_prompt = PromptTemplate(
        input_variables=['sentense', 'sensitiveInfo', 'matched_part'],
        template=prompts["semantic_match"]["prompt"],
    )

    few_shot_prompt = FewShotPromptTemplate(
        examples=fewshot_examples['semantic_match'],
        example_prompt=example_prompt,
        prefix=prompts["semantic_match"]["prefix"],
        suffix=prompts["semantic_match"]["suffix"],
        input_variables=['sentense', 'sensitiveInfo'],
        partial_variables={"format_instructions": match_parser.get_format_instructions()},
    )

    chain = LLMChain(llm=ChatOpenAI(model_name='gpt-3.5-turbo',temperature=0.5),
                        prompt=few_shot_prompt)
    res = chain.invoke(input={
        'sentense': sentence, 
        'sensitiveInfo': sensitiveInfo
    })

    cleaned_text = re.sub(r'```json|```', '', res['text']).strip()

    res = eval(cleaned_text)

    return res['matched_part']


def get_fact(policy, sensitive):
    curated_examples = []
    for i,v in enumerate(fewshot_examples['facts']):
        curated_examples.append({"policy": v["policy"], 
                                "sensitiveInfo":v["sensitiveInfo"], 
                                "fact_info":[]})
        for entry in v["fact_info"]:
            curated_examples[i]["fact_info"].append(FactInfo.model_validate(entry).model_dump_json().replace("{", "{{").replace("}", "}}"))

    examples = curated_examples

    card_parser = PydanticOutputParser(pydantic_object=Facts)
        
    example_prompt = PromptTemplate(
        input_variables=['policy', 'sensitiveInfo', 'fact_info'],
        template=prompts["facts"]["prompt"],
    )

    few_shot_prompt = FewShotPromptTemplate(
        examples=examples,
        example_prompt=example_prompt,
        prefix=prompts["facts"]["prefix"],
        suffix=prompts["facts"]["suffix"],
        input_variables=['policy', 'sensitiveInfo'],
        partial_variables={"format_instructions": card_parser.get_format_instructions()},
    )

    chain = LLMChain(llm=ChatOpenAI(model_name='gpt-4o',temperature=0.3),
                         prompt=few_shot_prompt)
    result = chain.invoke(input={
        'policy':policy, 
        'sensitiveInfo': sensitive
    })

    cleaned_text = re.sub(r'```json|```', '', result['text']).strip()

    result = eval(cleaned_text)

    return result


def get_risk(policy, sensitive, knowledge):
    card_parser = PydanticOutputParser(pydantic_object=Risks)

    prompt = PromptTemplate(
        template=prompts["risks_new"]["prompt"],
        input_variables=['policy', 'sensitiveInfo', 'knowledge'],
        partial_variables={"format_instructions": card_parser.get_format_instructions()},
    )

    chain = LLMChain(llm=ChatOpenAI(model_name='gpt-4o',temperature=1.0),
                         prompt=prompt)
    result = chain.invoke(input={
        'policy':policy, 
        'sensitiveInfo': sensitive,
        'knowledge': knowledge
    })

    # result = eval(result['text'])
    cleaned_text = re.sub(r'```json|```', '', result['text']).strip()

    result = eval(cleaned_text)

    return result


def run_in_parallel(policy, sensitive, knowledge):
    with ThreadPoolExecutor(max_workers=2) as executor:
        future_fact = executor.submit(get_fact, policy, sensitive)
        future_risk = executor.submit(get_risk, policy, sensitive, knowledge)
        facts = future_fact.result()
        risks = future_risk.result()
    return facts, risks


@app.post("/check_sensitive")
async def check_sensitive(request: checkRequest):  
    print(request) 
    sensitive = request.sensitive
    if request.policy == "gemini":
        facts, risks = run_in_parallel(gemini_policy, sensitive, knowledge)
    elif request.policy == "gpt":
        facts, risks = run_in_parallel(gpt_policy, sensitive, knowledge)

    response = {}
    response["facts"] = facts["facts"]

    for item in response["facts"]:
        item['fact_match'] = semantic_match(item['fact'], request.sensitive)
        
    response["risks"] = risks["risks"]
    print(response)
    return response


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)
