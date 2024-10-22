const style = document.createElement('style');
style.innerHTML = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .myLoader {
    border: 2px solid #f3f3f3;
    border-top: 2px solid #3498db;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    animation: spin 2s linear infinite;
  }

  .dashboard {
    display: grid;
    grid-template-columns: 1fr 1fr; 
    grid-template-rows: 1fr 1fr; 
    gap: 10px;
    height: 350px;
  }

  .card {
      background-color: #FFF;
      border: 1px solid black;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow-y: auto;
      padding: 10px;
  }

  .cardFact {
      grid-column: 1 / 2;
      grid-row: 1 / 3;
  }

  .cardRisk {
      grid-column: 2 / 3;
      grid-row: 1 / 3;
  }

  .cardIncidents {
      grid-column: 2 / 3;
      grid-row: 2 / 3;
  }

  #highlightContent mark {
    background-color: orange;
    color: transparent;
  }

  .tabs {
    display: flex;
    margin-bottom: 10px;
  }

  .tab {
    padding: 5px 10px;
    margin-right: 5px;
    cursor: pointer;
    background-color: #e9e9e9;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  .tab.active {
    background-color: #000;
    color: #fff;
  }
`;
document.getElementsByTagName('head')[0].appendChild(style);

let messageTimeCheck = "";
let sensitiveCheck = "";
let sensitiveType = "";
let sensitiveData = [];

document.body.addEventListener('input', function(event) {
  const addCloseButton = (id) => {
    const suggestionBox = document.getElementById('sgtBox');
    const sBoxDiv = document.getElementById(id);
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '4px';
    closeButton.style.right = '4px';
    closeButton.style.border = 'none';
    closeButton.style.background = 'transparent';
    closeButton.style.cursor = 'pointer';
    closeButton.style.padding = '0';

    closeButton.addEventListener('click', () => {
      suggestionBox.style.display = 'none';
    });

    sBoxDiv.appendChild(closeButton);
  };

  const highlightMatch = (stringA, stringB) => {
    const escapedStringB = stringB.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedStringB, 'g');
    const highlightedString = stringA.replace(regex, (match) => {
      return `<span style="background-color: orange; border-radius: 4px; padding: 2px 2px 2px 2px;">${match}</span>`;
    });
    return highlightedString;
  }

  const addButton = (suggestionBox, sensitiveInfo, positionAndSizeSuggestionBox, addCloseButton) => {

    const sBoxDiv = document.getElementById('suggestionBox');
    const suggestionButton = document.createElement('button');
    suggestionButton.innerText = 'Know more...';
    suggestionButton.style.position = 'absolute';
    suggestionButton.style.top = '10px';
    suggestionButton.style.right = '40px';
    suggestionButton.style.color = 'gray';

    sBoxDiv.appendChild(suggestionButton);

    suggestionButton.addEventListener('mouseenter', function() {
      this.style.color = 'black';
    });

    suggestionButton.addEventListener('mouseleave', function() {
      this.style.color = 'gray';
    });

    const loader = document.createElement('div');
    loader.className = 'myLoader';
    loader.style.display = 'none';
    loader.style.position = 'absolute';
    loader.style.top = '16px';
    loader.style.right = '22px';
    loader.style.color = 'blue';
    sBoxDiv.appendChild(loader);

    const fetchSensitiveInfo = async (sensitiveInfo) => {
      const fetchPromises = sensitiveInfo.map(sensitive => 
        fetch('http://localhost:8000/check_sensitive', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sensitive: sensitive, policy: "gpt" }),
        })
        .then(response => response.json())
        .then(data => ({ sensitive, data }))
      );
    
      const results = await Promise.all(fetchPromises);
      results.forEach(result => {
        sensitiveData.push(result);
      });
      loader.style.display = 'none';

      generateTabs(sensitiveData, addCloseButton);
    };

    suggestionButton.addEventListener('click', async () => {
      try {
        loader.style.display = 'block';
        sensitiveData = [];
        fetchSensitiveInfo(sensitiveInfo);
      } catch (error) {
        console.error('Error:', error);
      }
      // addCloseButton('sgtBox');
      positionAndSizeSuggestionBox();
    });
  };

  const generateTabs = (data, addCloseButton) => {
    const suggestionBox = document.getElementById('sgtBox');
    let tabHTML = '<div class="tabs">';
    let contentHTML = '';

    data.forEach((item, index) => {
      console.log(item);
      tabHTML += `<div class="tab${index === 0 ? ' active' : ''}" data-index="${index}">${item.sensitive}</div>`;
      contentHTML += `<div class="tab-content" id="tab-content-${index}" style="display: ${index === 0 ? 'block' : 'none'};">`;

      let cardHTML = `<div id='cards_title' style="margin-bottom: 8px;">The sensitive information <span style="background-color: orange; border-radius: 4px; padding: 2px 2px 2px 2px;"><strong>${item.sensitive}</strong></span> appears at least <strong>${item.data.facts.length}</strong> times in the privacy policy.</div><div class="dashboard">`;
      let cardFact = `<div class="card cardFact"><div "style="font-size: 18px;"><strong>Policy snippets</strong></div>`;
      let cardRisk = `<div class="card cardRisk"><div "style="font-size: 18px;"><strong>Potential risks</strong></div>`;

      item.data.facts.forEach((fact, factIndex) => {
        cardFact += `
          <strong>Data accessor:</strong> ${fact.accessor}<br/>
          <div style="font-size: 14px;"> <strong>Reason:</strong> ${fact.reason}</div>
          <span style="display: inline-block; vertical-align: middle;">
            <svg width="14px" height="14px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 6L18 18M18 18L18 9M18 18L9 18" stroke="#808080" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
          <a href="javascript:void(0);" class="togglePolicy" data-id="policy${index}_${factIndex}" style="color: gray; font-size: 14px; line-height: 1.5; text-decoration: none;">Refer to original text</a><br/>
          <span class="policyContent" id="policy${index}_${factIndex}" style="display: none; color: gray; font-size: 14px; line-height: 1.5; padding-left: 20px;">
            ${highlightMatch(fact.fact, fact.fact_match)}
          </span>
        `;
      });
      cardFact += `</div>`;

      item.data.risks.forEach((risk, riskIndex) => {
        cardRisk += `
          <span style="background-color: red; color: white; border-radius: 4px; padding: 2px 2px 2px 2px; font-weight: bold;">${risk.risk_type}</span><br/>
          ${risk.risk}<br/>
          <span style="display: inline-block; vertical-align: middle;">
            <svg width="14px" height="14px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 6L18 18M18 18L18 9M18 18L9 18" stroke="#808080" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
          <a href="javascript:void(0);" class="toggleRisk" data-id="riskExp${index}_${riskIndex}" style="color: gray; font-size: 14px; line-height: 1.5; text-decoration: none;">Detailed explanation</a><br/>
          <span class="riskContent" id="riskExp${index}_${riskIndex}" style="display: none; color: gray; font-size: 14px; line-height: 1.5; padding-left: 20px;">
            ${risk.explanation}
          </span>
        `;
      });
      cardRisk += `</div>`;

      cardHTML += cardFact + cardRisk;
      cardHTML += '</div>';
      contentHTML += cardHTML;
      contentHTML += '</div>';
    });

    tabHTML += '</div>';
    suggestionBox.innerHTML = tabHTML + contentHTML;

    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const index = tab.getAttribute('data-index');
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        tabContents.forEach(content => {
          content.style.display = 'none';
        });
        document.getElementById(`tab-content-${index}`).style.display = 'block';
      });
    });

    addCloseButton('sgtBox');
  };

  document.querySelectorAll("#prompt-textarea").forEach(div => {
    let suggestionBox;
    if (!document.getElementById('sgtBox')) {
      suggestionBox = document.createElement('div');
      suggestionBox.id = 'sgtBox';
      suggestionBox.style.position = 'absolute';
      suggestionBox.style.backgroundColor = '#e9e9e9';
      suggestionBox.style.border = '1px solid #ccc';
      suggestionBox.style.borderRadius = '8px';
      suggestionBox.style.padding = '10px';
      suggestionBox.style.marginTop = '-1em';
      suggestionBox.style.zIndex = '1000';
      suggestionBox.style.overflow = 'auto';
      suggestionBox.style.display = 'none';
      document.body.appendChild(suggestionBox);
    } else {
      suggestionBox = document.getElementById('sgtBox');
    }

    const positionAndSizeSuggestionBox = () => {
      const rect = div.getBoundingClientRect();
      suggestionBox.style.width = `${rect.width}px`;
      suggestionBox.style.top = `${window.scrollY + rect.top - suggestionBox.offsetHeight}px`;
      suggestionBox.style.left = `${window.scrollX + rect.left}px`;
    };

    positionAndSizeSuggestionBox();

    div.style.position = 'relative';
    div.style.background = 'transparent';
    div.style.zIndex = '2';

    div.addEventListener('input', (event) => {
      let highlightDiv;
      if (!document.getElementById('highlightContent')) {
        highlightDiv = document.createElement('div');
        highlightDiv.setAttribute('id', 'highlightContent');
        highlightDiv.style.position = 'absolute';
        highlightDiv.style.top = '8px';
        highlightDiv.style.left = '0';
        highlightDiv.style.width = '100%';
        highlightDiv.style.height = '100%';
        highlightDiv.style.zIndex = '1';
        highlightDiv.style.color = 'transparent';
        highlightDiv.style.whiteSpace = 'pre-wrap';
        highlightDiv.style.wordWrap = 'break-word';
        highlightDiv.style.overflowWrap = 'break-word';

        const container = div.parentNode;
        container.style.position = 'relative';
        container.appendChild(highlightDiv);
      } else {
        highlightDiv = document.getElementById('highlightContent');
      }

      const computedStyles = window.getComputedStyle(div);
      highlightDiv.style.padding = computedStyles.padding;

      const value = div.innerText;

      let highlightedText = value.replace(/</g, '&lt;').replace(/>/g, '&gt;');

      const triggers = [
        { phrase: "email", regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ },
        { phrase: "contact", regex: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/ },
        { phrase: "address", regex: /\b(?:St\.|Street|Rd\.|Road|Ave\.|Avenue)\b/ }
      ];

      let detectedSensitiveInfo = [];

      for (let trigger of triggers) {
        if (trigger.regex.test(value)) {
          detectedSensitiveInfo.push(trigger.phrase);

          var match = value.match(trigger.regex);
          if (match[0] != sensitiveCheck) {
            sensitiveCheck = match[0];
            sensitiveType = trigger.phrase;
          }
        }
      }

      if (detectedSensitiveInfo.length > 0) {
        suggestionBox.innerHTML = `<div id="suggestionBox">You input sensitive information: <strong>${detectedSensitiveInfo.join(', ')}</strong></div>`;
        addButton(suggestionBox, detectedSensitiveInfo, positionAndSizeSuggestionBox, addCloseButton);
        suggestionBox.style.display = 'block';
      } else {
        suggestionBox.style.display = 'none';
      }

      triggers.forEach(trigger => {
        highlightedText = highlightedText.replace(trigger.regex, (match) => `<mark>${match}</mark>`);
      });

      highlightDiv.innerHTML = highlightedText;

      document.getElementById('highlightContent').innerHTML = highlightedText.replace(/\n/g, '<br>');

      addCloseButton('sgtBox');
      positionAndSizeSuggestionBox();
    });

    window.addEventListener('resize', positionAndSizeSuggestionBox);
    window.addEventListener('scroll', positionAndSizeSuggestionBox);
});

});

document.body.addEventListener('click', function(event) {
  if (event.target.classList.contains('togglePolicy')) {
    var policyId = event.target.getAttribute('data-id');
    var policyContent = document.getElementById(policyId);
    if (policyContent.style.display === "none") {
      policyContent.style.display = "block";
      event.target.innerText = "Collapse the text";
    } else {
      policyContent.style.display = "none";
      event.target.innerText = "Refer to original text";
    }
  }

  if (event.target.classList.contains('toggleRisk')) {
    var riskId = event.target.getAttribute('data-id');
    var riskContent = document.getElementById(riskId);
    if (riskContent.style.display === "none") {
      riskContent.style.display = "block";
      event.target.innerText = "Collapse the text";
    } else {
      riskContent.style.display = "none";
      event.target.innerText = "Detailed explanation";
    }
  }
});