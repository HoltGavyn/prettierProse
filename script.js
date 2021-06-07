const app = {};

app.KEYCODE_ESC = 27; //ASCII Keycode for ESC
app.KEYCODE_ENTER = 13; // ASCII Keycode for ENTER

app.thesaurusKey = "9f59c76e-4541-4e94-aeb5-47747d6c0ef0";
app.thesaurusUrl =
  "https://dictionaryapi.com/api/v3/references/thesaurus/json/";

app.query;
app.definitionPromise;

app.clearFields = () => {
  $("#searchField").val("");
  $("#definitionsModal").empty();
  $(".thesaurus").empty();
};

// Call to Thesaurus API, returns an array of entries
app.getThesaurusReference = word => {
  return $.ajax({
    url: app.thesaurusUrl + word,
    method: "GET",
    dataType: "json",
    data: {
      key: app.thesaurusKey,
    },
  });
};

app.displaySentence = function (sentence) {
  $(".searchForm").addClass("hide");
  let sentenceHTML = ``;
  let i = 0;
  let curWord = "";
  // parse char by char through sentence
  while (i < sentence.length) {
    const curChar = sentence[i];
    // if char is a letter or ' , add to word
    if (/[a-zA-Z']/.test(curChar)) {
      curWord += curChar;
    } else {
      // punctuation or space found
      // if word is not empty:
      if (curWord) {
        // add word within span tags to HTML
        sentenceHTML += `<span>${curWord}</span>`;
        curWord = "";
      }
      // add trailing punctuation or spaces after word
      sentenceHTML += curChar;
    }
    i++;
  }
  // fixes edge case of no punctuation at end of sentence, adding final word
  if (curWord) {
    sentenceHTML += `<span>${curWord}</span>`;
  }
  console.log(sentenceHTML);
  // Insert completely constructed sentence HTML on page
  $(".sentenceContainer").append(`<p>${sentenceHTML}</p>`);
  $(".instructions").text("Click on any word to replace with a synonym...");
};

// Display definitions that match query
app.displayDefinitions = function (defArray, query) {
  // clear fields
  app.clearFields();
  // counter for word matches to be checked at end of function
  let matches = 0;
  try {
    // generate definitions from shortdefs property
    for (let i = 0; i < defArray.length; i++) {
      // only print entries which match query exactly ("Headword" must mach query)
      if (defArray[i].hwi.hw === query) {
        matches++;
        let shortDefsHTML = ``;
        defArray[i].shortdef.forEach(definition => {
          shortDefsHTML += `<li><p>${definition}</p></li>`;
        });
        // generate HTML for entire box of current definition
        // button stores array index to later retrieve synonyms
        let definitionBoxHTML = `
        <div class="definition-box" data-value="${i}">
          <h3 class="searchedWord">${defArray[i].hwi.hw}</h3>
          <h4>${defArray[i].fl}</h4>
          <ol class="definitions">
            ${shortDefsHTML}
          </ol>
        </div>
        `;
        // append all above HTML to .definitions-container
        $("#definitionsModal").append(definitionBoxHTML);
      }
    }
  } catch (err) {
    console.log(err);
    console.log("no such entry in thesaurus");
  } finally {
    if (!matches) {
      $("#definitionsModal").append(`<p>No results found.</p>`);
    }
  }
  //attach an event listener
  // app.modalEventListener();
};

app.getDefinitionIndexValue = function () {
  // create a promise to await a button click for index value of definition array
  return new Promise((resolve, reject) => {
    // using bubbling, listen for div clicks within #definitionsModal
    $("#definitionsModal").on("click", "div", function (e) {
      // gets data-value from div
      resolve($(this).data("value"));
    });
  });
};

// takes in a single definition object from definitionArray, and outputs all related synonyms
app.displaySynonyms = function (curDefinition) {
  app.clearFields();
  // for now, get the first entry of synonyms
  let synonymsUL = ``;
  // loop through all possible synonyms and append to synonymsUL
  for (let i = 0; i < curDefinition.meta.syns.length; i++) {
    curDefinition.meta.syns[i].forEach(synonym => {
      synonymsUL += `<li><p>${synonym}</p></li>`;
    });
  }
  let synonymBoxHTML = `
    <div class="synonyms-box">
      <h3>Synonyns:</h3>
      <ul class="thesaurus">
        ${synonymsUL}
      </ul>
    </div>`;
  $("#definitionsModal").append(synonymBoxHTML);
};

app.getSynonymChoice = function () {
  return new Promise((resolve, reject) => {
    $(".synonyms-box li p").on("click", function (e) {
      resolve(e.currentTarget.innerText);
    });
  });
};

app.handleDefinitonModal = async function (event) {
  let query = event.currentTarget.innerText;
  // set the promise from Thesaurus API
  const promise = app.getThesaurusReference(query);
  // get array of definitions for reference
  const definitionArray = await promise.then(res => res);

  // get and display definition using array
  app.displayDefinitions(definitionArray, query);

  // when definition is clicked, get definiton index value and display synonyms for that definition
  const buttonIdx = await app.getDefinitionIndexValue().then(res => res);
  app.displaySynonyms(definitionArray[buttonIdx]);

  // event listener to get synonym selected from user
  const newWord = await app.getSynonymChoice();

  // change word in sentence to new word
  event.currentTarget.innerText = newWord;

  // hide modal
  $("#definitionsModal").addClass("hide");
};

app.modalEventListener = function () {
  // event listener to close modal when clicked outside
  $("body").on("click", function (e) {
    let isModal =
      $(e.target).is("#definitionsModal") ||
      $(e.target).is("#definitionsModal *");
    console.log($(e.target).closest("#definitionsModalRoot"));
    if (!isModal) {
      $("#definitionsModal").addClass("hide");
    }
  });
};

// display definition modal underneath clicked word
app.displayDefinitionModal = function (topPos, leftPos) {
  // updated definitions-container position to be right under a given word
  $("#definitionsModal").css("left", leftPos);
  $("#definitionsModal").css("top", topPos);
  $("#definitionsModal").removeClass("hide");
};

app.init = () => {
  // event listener to capture keypresses
  $(document).keydown(function (e) {
    // if ESC press, close definition modal
    if (e.keyCode == app.KEYCODE_ESC) {
      $("#definitionsModal").addClass("hide");
    }
    // if enter pressed (without shift), submit form
    if (e.keyCode == app.KEYCODE_ENTER && !e.shiftKey) {
      $(".searchForm").submit();
    }
  });

  $(".searchForm").on("submit", function (e) {
    e.preventDefault();
    const sentence = $("#searchField").val().trim();
    app.displaySentence(sentence);

    // event listener to look up definitions when span clicked
    $("span").on("click", function (e) {
      // get top and left offset parameters for Modal
      const top = e.currentTarget.offsetTop + e.currentTarget.offsetHeight + 5;
      const left = e.currentTarget.offsetLeft;

      //display definition Modal
      app.displayDefinitionModal(top, left);

      //handle logic within Modal to ultimately select a new word
      app.handleDefinitonModal(e);
    });
  });
};

$(function () {
  app.init();
});
