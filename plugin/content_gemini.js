// 全局变量来存储当前的高亮颜色
let currentHighlightColor = 'yellow';
let globalSensitiveData;

/**
 * Annotates sensitive information in the target element by fetching context data from a server.
 * @param {Element} targetElement - The DOM element containing the text to be checked.
 */
function annotateSensitiveInfo(targetElement) {
  const contextData = { context: targetElement.innerText };

  return fetch('http://localhost:8000/getContext', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(contextData),
  })
  .then(response => response.json())
  .then(data => {
    console.log('Success:', data);
    globalSensitiveData = data;
    if (data.sensitive_info && data.sensitive_info.length > 0) {
      console.log('Sensitive information detected:', data.sensitive_info);
      highlightSensitiveInfo(targetElement, data.sensitive_info);
    } else {
      console.log('No sensitive information detected');
    }
    return data;
  })
  .catch((error) => {
    console.error('Error:', error);
    return null;
  });
}

/**
 * Handles the click event and checks if the target element is available, then replaces the jsname element.
 * @param {Event} event - The click event.
 */
function handleClick(event) {
  const targetElement = document.querySelector('.a3s.aiL');

  if (targetElement) {
    setTimeout(() => {
      replaceJsnameElement();
    }, 100);
  } else {
    console.log('Target element not found');
  }
}

/**
 * Highlights sensitive information within a DOM element by wrapping it with a span element.
 * When the highlighted text is clicked, it changes its background color to orange and resets others to yellow.
 * If a tab with a corresponding entity type exists (based on tab text content), it also triggers the tab click.
 * @param {Element} element - The DOM element containing the text to be highlighted.
 * @param {Array} sensitiveInfo - An array of sensitive information objects.
 */
function highlightSensitiveInfo(element, sensitiveInfo) {
  let innerHTML = element.innerHTML;

  sensitiveInfo.forEach(info => {
    const sensitiveText = info.text;
    const entityTypeClass = `entity-${info.entity_type}`;
    if (!sensitiveText.includes("unsubscribe")) {
      const escapedText = escapeRegExp(sensitiveText);
      const highlightedText = `<span class="highlight-sensitive ${entityTypeClass}" style="background-color: yellow; cursor: pointer;">${sensitiveText}</span>`;
      innerHTML = innerHTML.replace(new RegExp(escapedText, 'g'), highlightedText);
    }
  });

  element.innerHTML = innerHTML;

  // Add event listener for click event to change the color to orange and reset others to yellow
  const highlightElements = element.querySelectorAll('.highlight-sensitive');
  highlightElements.forEach(el => {
    el.addEventListener('click', function() {
      // Reset all highlights to yellow
      highlightElements.forEach(item => {
        item.style.backgroundColor = 'yellow';
      });
      // Set the clicked one to orange
      this.style.backgroundColor = 'orange';

      // Get the entity type from the element's class
      const classes = Array.from(this.classList);
      const entityTypeClass = classes.find(cls => cls.startsWith('entity-'));
      if (entityTypeClass) {
        const entityType = entityTypeClass.replace('entity-', '');

        // Find the corresponding tab by matching its text content with the entity type
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
          if (tab.textContent.trim() === entityType) {
            tab.click(); // Trigger the tab click event if the text matches the entity type
          }
        });
      }
    });
  });
}

/**
 * Escapes special characters in a string to use in a regular expression.
 * @param {string} string - The string to escape.
 * @returns {string} - The escaped string.
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Removes the highlight from the sensitive information within a DOM element.
 * @param {Element} element - The DOM element containing the highlighted text.
 */
function removeHighlight(element, sensitiveInfo) {
  let innerHTML = element.innerHTML;

  sensitiveInfo.forEach(info => {
    const sensitiveText = info.text;
    const entityTypeClass = `entity-${info.entity_type}`;
    if (!sensitiveText.includes("unsubscribe")) {
      // 将高亮的HTML代码转换为原始文本
      const escapedText = escapeRegExp(sensitiveText);
      const highlightedTextRegex = new RegExp(`<span class="highlight-sensitive ${entityTypeClass}" style="background-color: yellow; cursor: pointer;">${escapedText}</span>`, 'g');
      innerHTML = innerHTML.replace(highlightedTextRegex, sensitiveText);
    }
  });

  element.innerHTML = innerHTML;
}

/**
 * Adds a custom input field next to the specified jsname element.
 * @param {Element} jsnameElement - The DOM element to place the input field next to.
 */
function addMyInput(jsnameElement) {
  const inputField = document.createElement('input');
  inputField.id = "myInputField";
  inputField.type = 'text';
  inputField.placeholder = 'My input field';
  inputField.style.width = '90%';
  inputField.style.padding = '16px';
  inputField.style.borderRadius = '12px';
  inputField.style.border = '0px';
  inputField.style.backgroundColor = '#F5F7FA';
  inputField.style.fontSize = '16px';
  inputField.style.color = '#444';

  const parentElement = jsnameElement.parentElement;
  const wrapperDiv = document.createElement('div');
  wrapperDiv.className = 'input-wrapper';
  wrapperDiv.appendChild(inputField);

  if (parentElement) {
    if (jsnameElement.nextSibling) {
      parentElement.insertBefore(wrapperDiv, jsnameElement.nextSibling);
    } else {
      parentElement.appendChild(wrapperDiv);
    }
  }

  inputField.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      const jsnameElement = document.querySelector('[jsname="JMIhHc"]');
      jsnameElement.innerText = inputField.value;
      jsnameElement.style.display = 'block';
      const targetElement = document.querySelector('.a3s.aiL');
      if (targetElement) {
        annotateSensitiveInfo(targetElement).then(data => {
          if (data && data.sensitive_info && data.sensitive_info.length > 0) {
            showPopup(inputField, data.sensitive_info);
          }
        });
      } else {
        console.log('Target element not found');
      }
    }
  });
}

/**
 * Replaces the jsname element by hiding it and adding a custom input field.
 */
function replaceJsnameElement() {
  const jsnameElement = document.querySelector('[jsname="JMIhHc"]');
  if (jsnameElement) {
    jsnameElement.style.display = 'none';
    addMyInput(jsnameElement);
  }
}

/**
 * Observes changes in the DOM and attaches event listeners to newly added "Ask Gemini" buttons.
 */
function observeDOMChanges() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          if (node.tagName === "BUTTON" && node.getAttribute("aria-label") === "Ask Gemini") {
            node.addEventListener("click", handleClick);
          }
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Initializes the script by adding event listeners to "Ask Gemini" buttons and observing DOM changes.
 */
window.addEventListener('load', () => {
  document.querySelectorAll('button[aria-label="Ask Gemini"]').forEach(button => {
    button.addEventListener("click", handleClick);
  });
  observeDOMChanges();
});

const highlightMatch = (stringA, stringB) => {
  const escapedStringB = stringB.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedStringB, 'g');
  const highlightedString = stringA.replace(regex, (match) => {
    return `<span style="background-color: orange; border-radius: 4px; padding: 2px 2px 2px 2px;">${match}</span>`;
  });
  return highlightedString;
}

/**
 * Shows a popup window with a message about sensitive information above the specified input field.
 * @param {Element} inputField - The input field element to position the popup above.
 * @param {Array} sensitiveInfo - An array of sensitive information objects.
 */
function showPopup(inputField, sensitiveInfo) {
  const rect = inputField.getBoundingClientRect();
  
  // Create popup elements
  const popup = document.createElement('div');
  popup.id = 'sgtBox';
  popup.style.position = 'absolute';
  popup.style.left = `${rect.left}px`;
  popup.style.width = `${rect.width * 0.92}px`; // Match the width of the input field
  popup.style.backgroundColor = '#e9e9e9';
  popup.style.padding = '10px';
  popup.style.border = '1px solid #ccc';
  popup.style.borderRadius = '8px';
  popup.style.zIndex = '1000';
  popup.style.fontSize = '14px';

  const popupText = document.createElement('p');
  popupText.innerText = 'Sensitive information in this email:';
  popupText.style.margin = '0';
  popupText.style.paddingRight = '20px';

  const uniqueEntityTypes = new Set();
  sensitiveInfo.forEach(info => {
    if (!uniqueEntityTypes.has(info.entity_type)) {
      uniqueEntityTypes.add(info.entity_type);
      popupText.innerHTML += ` <strong>${info.entity_type}</strong>;`;
    }
  });

  const closeBtn = document.createElement('span');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '5px';
  closeBtn.style.right = '10px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.addEventListener('click', () => {
    document.body.removeChild(popup);
    const targetElement = document.querySelector('.a3s.aiL');
    removeHighlight(targetElement, globalSensitiveData.sensitive_info);
  });

  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.justifyContent = 'space-between';

  const knowMoreButton = document.createElement('button');
  knowMoreButton.innerText = 'Know More...';
  knowMoreButton.style.border = 'none';
  knowMoreButton.style.color = 'gray';
  knowMoreButton.style.paddingTop = '5px';
  knowMoreButton.style.paddingLeft = '0px';
  knowMoreButton.style.backgroundColor = 'transparent'; // Set background to transparent

  const sendOutButton = document.createElement('button');
  sendOutButton.innerText = 'Send Out';
  sendOutButton.style.border = 'none';
  sendOutButton.style.color = 'gray';
  sendOutButton.style.paddingTop = '5px';
  sendOutButton.style.backgroundColor = 'transparent'; // Set background to transparent

  buttonContainer.appendChild(knowMoreButton);
  buttonContainer.appendChild(sendOutButton);

  knowMoreButton.addEventListener('mouseenter', function() {
    this.style.color = 'black';
  });

  knowMoreButton.addEventListener('mouseleave', function() {
    this.style.color = 'gray';
  });

  sendOutButton.addEventListener('mouseenter', function() {
    this.style.color = 'black';
  });

  sendOutButton.addEventListener('mouseleave', function() {
    this.style.color = 'gray';
  });

  const loader = document.createElement('div');
  loader.className = 'myLoader';
  loader.style.display = 'none';
  loader.style.position = 'absolute';
  loader.style.top = '16px';
  loader.style.right = '22px';
  loader.style.color = 'blue';

  popup.appendChild(popupText);
  popup.appendChild(closeBtn);
  popup.appendChild(buttonContainer);
  popup.appendChild(loader);

  document.body.appendChild(popup);

  // Adjust the position of the popup to be above the wrapperDiv with a 5px gap
  const popupRect = popup.getBoundingClientRect();
  popup.style.top = `${rect.top - popupRect.height - 5}px`; // Adjust as needed for 5px gap

  knowMoreButton.addEventListener('click', async () => {
    loader.style.display = 'block';
    await fetchSensitiveInfo(sensitiveInfo);
    const jsnameElement = document.querySelector('[jsname="JMIhHc"]');
    if (jsnameElement) {
      jsnameElement.style.display = 'none';
    }
  });

  sendOutButton.addEventListener('click', async () => {
      let jsnameElement = document.querySelector('[jsname="JMIhHc"]');
      let sgtBox = document.getElementById("sgtBox");
      sgtBox.style.display = 'none';
      inputField.style.display = 'none';

      if (jsnameElement) {
          jsnameElement.style.display = 'block';

          let dispatched = false; // Flag to ensure dispatch happens only once

          const observer = new MutationObserver((mutations) => {
              mutations.forEach((mutation) => {
                  if (mutation.type === 'childList' || (mutation.type === 'attributes' && mutation.attributeName === 'style')) {
                      if (jsnameElement.style.display === 'block' && jsnameElement.firstElementChild && !dispatched) {
                          console.log(inputField.value);
                          jsnameElement.firstElementChild.textContent = inputField.value;
                          resizeWindowTemporarily();

                          // Simulate a click on the jsnameElement
                          jsnameElement.click();

                          // Simulate pressing the Enter key
                          const enterEvent = new KeyboardEvent('keydown', {
                              key: 'Enter',
                              keyCode: 13,
                              which: 13,
                              bubbles: true
                          });
                          jsnameElement.dispatchEvent(enterEvent);

                          dispatched = true; // Set the flag to true to prevent further dispatches
                          
                          if (popup){
                            document.body.removeChild(popup);
                          }
                          const targetElement = document.querySelector('.a3s.aiL');
                          removeHighlight(targetElement, globalSensitiveData.sensitive_info);

                          setTimeout(() => {
                              replaceJsnameElement();
                          }, 100);
                     }
                  }
              });
              observer.disconnect(); // Stop observing after the operation is done
          });

          // Observe changes in attributes and child nodes
          observer.observe(jsnameElement, {
              attributes: true,
              childList: true,
              subtree: true
          });
      } else {
          console.error('Element with jsname="JMIhHc" not found.');
      }
  });


  const fetchSensitiveInfo = async (uniqueEntityTypes) => {
    let sensitiveData = [];
    const fetchPromises = uniqueEntityTypes.map(async sensitive => {
      const response = await fetch('http://localhost:8000/check_sensitive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sensitive: sensitive.entity_type, policy: "gemini" }),
      });
      const data = await response.json();
      return { sensitive, data };
    });
  
    const results = await Promise.all(fetchPromises);
    results.forEach(result => {
      sensitiveData.push(result);
    });
    loader.style.display = 'none';
    console.log(sensitiveData);
    generateTabs(sensitiveData, addCloseButton);
  };

  const generateTabs = (data, addCloseButton) => {
    const suggestionBox = document.getElementById('sgtBox');
    let tabHTML = '<div class="tabs" style="margin-top: 20px">';
    let contentHTML = '';

    data.forEach((item, index) => {
      console.log(item);
      tabHTML += `<div class="tab${index === 0 ? ' active' : ''}" data-index="${index}">${item.sensitive.entity_type}</div>`;
      contentHTML += `<div class="tab-content" id="tab-content-${index}" style="display: ${index === 0 ? 'block' : 'none'};">`;

      let cardHTML = `<div id='cards_title' style="margin-bottom: 8px;">The sensitive information <span style="background-color: orange; border-radius: 4px; padding: 2px 2px 2px 2px;"><strong>${item.sensitive.entity_type}</strong></span> appears at least <strong>${item.data.facts.length}</strong> times in the privacy policy.</div><div class="dashboard">`;
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
    updateHighlightColor(tabs[0].textContent.trim());

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const index = tab.getAttribute('data-index');
        const entityType = tab.textContent.trim();
    
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
    
        tabContents.forEach(content => {
          content.style.display = 'none';
        });
        document.getElementById(`tab-content-${index}`).style.display = 'block';
    
        updateHighlightColor(entityType);
      });
    });

    addCloseButton('sgtBox');
    
    // Create and add the return button
    const returnButton = document.createElement('button');
    returnButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-arrow-left"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`;
    returnButton.style.position = 'absolute';
    returnButton.style.top = '10px';
    returnButton.style.left = '5px';
    returnButton.style.border = 'none'; // No border for the return button
    returnButton.style.borderRadius = '4px';
    returnButton.style.cursor = 'pointer';
    returnButton.style.backgroundColor = 'transparent';

    returnButton.addEventListener('click', () => {
      const suggestionBox = document.getElementById('sgtBox');
      if (suggestionBox) {
        suggestionBox.remove();
      }

      const inputField = document.getElementById("myInputField");

      showPopup(inputField, globalSensitiveData.sensitive_info)
    });

    suggestionBox.appendChild(returnButton);
    suggestionBox.style.top = '7%';
  };

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
}

// 更新高亮颜色的函数
function updateHighlightColor(entityType) {
  const highlightedElements = document.querySelectorAll('.highlight-sensitive');

  highlightedElements.forEach(element => {
    if (element.classList.contains(`entity-${entityType}`)) {
      element.style.backgroundColor = 'orange';
    } else {
      element.style.backgroundColor = 'yellow';
    }
  });
}

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


// 保存原始窗口宽度
const originalWidth = window.innerWidth;

// 计算缩小10%后的宽度
const reducedWidth = originalWidth * 0.9;

// 创建一个缩小窗口宽度的函数
function shrinkWindow() {
    document.documentElement.style.width = `${reducedWidth}px`;
}

// 创建一个恢复原始窗口宽度的函数
function restoreWindow() {
    document.documentElement.style.width = `${originalWidth}px`;
}

// 执行缩小和恢复操作
function resizeWindowTemporarily() {
    shrinkWindow();

    // 使用setTimeout来模拟快速复原
    setTimeout(() => {
        restoreWindow();
        // 触发一次resize事件
        window.dispatchEvent(new Event('resize'));
    }, 100); // 100ms后恢复
}


// Style for loader and tabs
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
      grid-template-columns: 1fr; /* 设置为一列 */
      grid-template-rows: 1fr 1fr; /* 设置为两行，每行各占50%的高度 */
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
      grid-row: 1 / 2; /* 占用第一行 */
  }

  .cardRisk {
      grid-row: 2 / 3; /* 占用第二行 */
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
