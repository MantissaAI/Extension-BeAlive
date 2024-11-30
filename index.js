// The main script for the extension
// The following are examples of some basic extension functionality

//You'll likely need to import extension_settings, getContext, and loadExtensionSettings from extensions.js
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";

//You'll likely need to import some other functions from the main script
import { saveSettingsDebounced, chat_metadata, eventSource, event_types } from "../../../../script.js";

import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { SlashCommandArgument, ARGUMENT_TYPE } from '../../../slash-commands/SlashCommandArgument.js';
import { SlashCommand } from '../../../slash-commands/SlashCommand.js';

// Keep track of where your extension is located, name should match repo name
const extensionName = "Extension-BeAlive";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const extensionSettings = extension_settings[extensionName];
const defaultSettings = {
  longterm:100,
  shortterm:20,
  method:"hide",
  size:20,
  overlap:5,
  wait:0
};
let enabled = false;

 
// Loads the extension settings if they exist, otherwise initializes them to the defaults.
async function loadSettings() {
  //Create the settings if they don't exist
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }
  // Updating settings in the UI
  // $("#example_setting").prop("checked", extension_settings[extensionName].example_setting).trigger("input");
  $("#longterm").val(extension_settings[extensionName].longterm);
  $("#shortterm").val(extension_settings[extensionName].shortterm);
  $("#method").val(extension_settings[extensionName].method);
  $("#size").val(extension_settings[extensionName].size);
  $("#overlap").val(extension_settings[extensionName].overlap);
  $("#wait").val(extension_settings[extensionName].wait);
}

// This function is called when the extension settings are changed in the UI
function onInput(event) {
  // const value = Boolean($(event.target).prop("checked"));
  // extension_settings[extensionName].example_setting = value;
  // saveSettingsDebounced();
  // toastr.info('changed');
  extension_settings[extensionName].longterm = Number($("#longterm").val());
  extension_settings[extensionName].shortterm = Number($("#shortterm").val());
  extension_settings[extensionName].method = ($("#method").val());
  extension_settings[extensionName].size = Number($("#size").val());
  extension_settings[extensionName].overlap = Number($("#overlap").val());
  extension_settings[extensionName].wait = Number($("#wait").val());
  saveSettingsDebounced();
}

function obliviate(i){
  let cont = SillyTavern.getContext()
  console.log(`BEALIVE: Obliviate ${i} : ${cont.chat[i].mes}!`)
  if (extension_settings[extensionName].method == 'delete') cont.executeSlashCommands(`/cut ${i}`);
  else cont.executeSlashCommands(`/hide ${i}`);
}


function rev(chat){
  let cont = SillyTavern.getContext();
  // console.log(chat);
  // let joinmes = chat.map(item => item.name + ':' + item.mes + (item.score != undefined ? ' [Score: ' + item.score + ']' : '')).join('\n\n');
  let joinmes = chat.map((item, index) => index + ') ' + item.name + ': ' + item.mes + (item.score !== undefined ? ' [Score: ' + item.score + ']' : '')).join('\n\n').replace(/"/g, "'");;
  // console.log(joinmes);
  let reqstring = `
[Pause your roleplay. I have a list of messages. You have to indicate for each message how important it is to remember on a scale of 0-100. Here's the list:
[
${joinmes}
]
Raising Criteria:
+ Important information
+ Events that are dear to the author or someone else.
Decreasing criteria:
- Routine life
- A message that doesn't make sense.
List the answers. If the message already has a score, just repeat it. Only return the answer, and nothing else. Example output: “Final answer: 0) 0\n 1) 0\n 2) 0\n 3) 0”.]. Answer only in this format. Don't make any comments.\nFinal answer:`;
  cont.executeSlashCommands(`/genraw "${reqstring}"`).then(ans => {
    let answers = (ans.pipe.includes('Final answer:') ? ans.pipe.split('Final answer: ')[1] : ans.pipe).match(/(\d+)\)\s*(\d+)/g)?.map(item => +item.split(') ')[1]) || [];
    // console.log(answers);
    for (let i = 0; i<chat.length; i++) {
      // let indexInChat0 = cont.chat.findIndex(c => c === chat[i]);
      let indexInChat0 = cont.chat.findIndex(c => c === chat[i]);
      if (cont.chat[indexInChat0]) cont.chat[indexInChat0].score = answers[i];
      cont.saveChat();
    }
    showScore();
  });
}


async function onRevision(show = false){
  if (!enabled) {
    toastr.error("ERROR! Not BEALIVE chat!");
    return;
  };
  // toastr.info("Revision logic not implemented");
  let cont = SillyTavern.getContext()
  let chat0 = cont.chat
  let chat = chat0.filter(c0 => c0.is_system !== true);
  // await new Promise(resolve => setTimeout(resolve, extension_settings[extensionName].wait));
  for (let i = 0; i <= chat.length; i+=extension_settings[extensionName].size) {
    // if (chat[i].score == undefined) {
    //   chat[i].score = 50;
    // };
    let sl = chat.slice(Math.max(0,i-extension_settings[extensionName].overlap), i+extension_settings[extensionName].size);
    if (sl.some(item => item.score === undefined)) {
      // console.log(Math.max(0,i-extension_settings[extensionName].overlap), i+extension_settings[extensionName].size);
      // console.log(sl);
      // Ваш код, если хотя бы у одного элемента нет параметра score
      await new Promise(resolve => setTimeout(resolve, extension_settings[extensionName].wait));
      rev(sl);
    }
  }

  let shortchat = chat.slice(-extension_settings[extensionName].shortterm).filter(c0 => c0.score !== undefined);
  let longchat = chat.slice(0, chat.length - extension_settings[extensionName].shortterm);


  if (longchat.length > extension_settings[extensionName].longterm) {
    // Сортируем longchat по score в порядке возрастания
    longchat.sort((a, b) => a.score - b.score);

    // Удаляем лишние элементы
    let excessCount = longchat.length - extension_settings[extensionName].longterm;
    for (let i = 0; i < excessCount; i++) {
        let itemToRemove = longchat[i];
        
        // Находим индекс элемента в chat0 по id
        let indexInChat0 = chat0.findIndex(c => c === itemToRemove);
        
        // Если элемент найден, вызываем функцию Obliviate
        if (indexInChat0 !== -1) {
            obliviate(indexInChat0);
        }
    }
  }

  cont.saveChat();
  showScore();
  console.log('BEALIVE: Revision complete.')
  if (show) toastr.success("Revision complete!");
}


function showScore() {
  if (!enabled) {
    toastr.error("ERROR! Not BEALIVE chat!");
    return;
  };
  let cont = SillyTavern.getContext();
  let chat0 = cont.chat;

  const messageElements = document.querySelectorAll('.mes');

  messageElements.forEach(messageElement => {
    // Получаем mesid из атрибута mesid
    const mesid = parseInt(messageElement.getAttribute('mesid'));

    // Находим соответствующий объект в chat0 по mesid
    const chatItem = chat0[mesid];

    // Если объект найден, добавляем score в элемент с датой сообщения
    if (chatItem) {
      // Находим элемент с датой сообщения
      const timestampElement = messageElement.querySelector('.timestamp');

      // Добавляем score к тексту даты
      timestampElement.textContent = chatItem.score == undefined ? chatItem.send_date : chatItem.send_date + ` | (Score: ${chatItem.score})`;
    }
  });
}



function resetState(){
  if (SillyTavern.getContext().chatId.includes("bealive")) {
    enabled = true;
    // toastr.success("Bealive system online!")
    $("#alive").text("🟢 Enabled")
    showScore();
  }
  else {
    enabled = false;
    $("#alive").text("🔴 Disabled")
  }
}



// This function is called when the extension is loaded
jQuery(async () => {
  // This is an example of loading HTML from a file
  const settingsHtml = await $.get(`${extensionFolderPath}/settings.html`);

  // Append settingsHtml to extensions_settings
  // extension_settings and extensions_settings2 are the left and right columns of the settings menu
  // Left should be extensions that deal with system functions and right should be visual/UI related 
  $("#extensions_settings").append(settingsHtml);

  // These are examples of listening for events
  $("#longterm").on("input", onInput);
  $("#shortterm").on("input", onInput);
  $("#method").on("change", onInput);
  $("#size").on("input", onInput);
  $("#overlap").on("change", onInput);
  $("#wait").on("change", onInput);
  $("#revision").on("click", () => {onRevision(true);});

  eventSource.on(event_types.CHAT_CHANGED, () => {
    resetState();
  });
  eventSource.on(event_types.MESSAGE_SENT, () => {
    if (enabled) {
      // onRevision();
    };
  });
  // $("#longterm").on("input", onButtonClick)
  // Load settings when starting things up (if you have any)
  loadSettings();
  
  
  SlashCommandParser.addCommandObject(SlashCommand.fromProps({ name: 'set-score',
    callback: (namedArgs, unnamedArgs) => {
      if (!enabled) {
        toastr.error("ERROR! Not BEALIVE chat!");
        return;
      };
      unnamedArgs = unnamedArgs.split(' ')
      let cont = SillyTavern.getContext();
      let chat0 = cont.chat;
      if (!['undefined', 'clear', 'no', 'und'].includes(unnamedArgs[1]))
        chat0[Number(unnamedArgs[0])].score = Number(unnamedArgs[1]);
      else chat0[Number(unnamedArgs[0])].score = undefined;
      cont.saveChat();
      // console.log(chat0[Number(unnamedArgs[0])]);
      showScore();
      return 'succes';
    },
    aliases: ['scr'],
    returns: 'empty',
    unnamedArgumentList: [
      SlashCommandArgument.fromProps({ description: 'Message Id',
        typeList: ARGUMENT_TYPE.NUMBER,
        isRequired: true,
      }),
      SlashCommandArgument.fromProps({ description: 'Score',
        typeList: ARGUMENT_TYPE.NUMBER,
        isRequired: true,
      }),
    ],
    helpString: `
    <div>
    Set the message score. Can be number or undefined (aliases: 'clear', 'undefined', 'no', 'und').
    </div>
    <div>
    <strong>Example:</strong>
    <ul>
    <li>
    <pre><code class="language-stscript">/set-score 0 50</code></pre>
    </li>
    <li>
    <pre><code class="language-stscript">/scr 1 no </code></pre>
    </li>
    </ul>
    </div>
    `,
  }));
  
  SlashCommandParser.addCommandObject(SlashCommand.fromProps({ name: 'revise',
    callback: (namedArgs, unnamedArgs) => {
      onRevision(true);
      return 'success';
    },
    aliases: ['rvs'],
    returns: 'empty',
    helpString: `
    <div>
    Revises chat (from be-alive extension).
    </div>
    <div>
    <strong>Example:</strong>
    <ul>
    <li>
    <pre><code class="language-stscript">/revise</code></pre>
    </li>
    <li>
    <pre><code class="language-stscript">/rvs </code></pre>
    </li>
    </ul>
    </div>
    `,
  }));
});
