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

app.wordClickListener = function () {
  // event listener to look up definitions when span clicked
  $("span").on("click", function (e) {
    // hide modal in case it's already open
    $("#definitionsModal").addClass("hide");
    // turn off modal listener in case it's already open
    $(document).off("click");

    //handle logic within Modal to ultimately select a new word
    app.handleDefinitonModal(e);
  });
};

app.displaySentence = function (sentence) {
  // display startover button and hide search form
  $(".startOver").removeClass("hide");
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
  let outputHTML = "";
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
        const definitionHTML = `
          <div class="definition-box" data-value="${i}">
            <h3 class="searchedWord">${defArray[i].hwi.hw}</h3>
            <h4>${defArray[i].fl}</h4>
            <ol class="definitions">
              ${shortDefsHTML}
            </ol>
          </div>`;
        // add current definition HTML to definitionsBoxHTML
        outputHTML += definitionHTML;
      }
    }
    if (!matches) {
      outputHTML = `<p>No synonyms found.</p>`;
    }
  } catch (err) {
    outputHTML = `<p>No definition found.</p>`;
  }
  $("#definitionsModal").append(outputHTML);
};

app.getDefinitionIndexValue = function () {
  // create a promise to await a button click for index value of definition array
  return new Promise(resolve => {
    // using bubbling, listen for div clicks within #definitionsModal
    $("#definitionsModal").on("click", "div", function () {
      // gets data-value from div
      resolve($(this).data("value"));
    });
  });
};

// takes in a single definition object from definitionArray, and outputs all related synonyms
app.displaySynonyms = function (curDefinition) {
  // setTmeout avoids issue with .definition-box detatching before modalEvent listener can register click
  setTimeout(function () {
    // for now, get the first entry of synonyms
    let synonymsUL = ``;
    // loop through all possible synonyms and append to synonymsUL
    for (let i = 0; i < curDefinition.meta?.syns.length; i++) {
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

    $("#definitionsModal").html(synonymBoxHTML);
  }, 0);
};

app.getSynonymChoice = function () {
  return new Promise(resolve => {
    setTimeout(function () {
      $(".synonyms-box").on("click", "p", function (e) {
        resolve(e.currentTarget.innerText);
      });
    }, 0);
  });
};

app.handleDefinitonModal = async function (event) {
  let query = event.currentTarget.innerText.toLowerCase();
  // set the promise from Thesaurus API
  // get array of definitions for reference
  const definitionArray = await app
    .getThesaurusReference(query)
    .then(function (res) {
      // get and display definition using array
      app.displayDefinitions(res, query);
      return res;
    });

  // get top and left offset parameters for Modal position
  const modalTop =
    event.currentTarget.offsetTop + event.currentTarget.offsetHeight + 5;
  const modalLeft = event.currentTarget.offsetLeft;

  //display definition Modal
  app.displayDefinitionsModal(modalTop, modalLeft);

  //attach an event listener to close Modal if mouse clicked outside of Modal
  app.modalEventListener();

  // when definition is clicked, get definiton index value and display synonyms for that definition
  const definitionIdx = await app.getDefinitionIndexValue();

  app.displaySynonyms(definitionArray[definitionIdx]);

  // event listener to get synonym selected from user
  app.getSynonymChoice().then(function (res) {
    // change word in sentence to new word
    event.currentTarget.innerText = res;
    // hide modal
    $("#definitionsModal").addClass("hide");
    // turn off modal listener
    $(document).off("click");
  });
};

app.modalEventListener = function () {
  // checks to see if click is in modal, closes if not
  $(document).on("click", function (e) {
    // Boolean: is the modal or a child of the modal
    let isModal =
      $(e.target).is("#definitionsModal") ||
      $(e.target).is("#definitionsModal *");
    if (!$(e.target).closest("#definitionsModal").length && !isModal) {
      $("#definitionsModal").addClass("hide");
      $(document).off("click");
    }
  });
};

// display definition modal underneath clicked word
app.displayDefinitionsModal = function (topPos, leftPos) {
  // updated definitions-container position to be right under a given word
  $("#definitionsModal").css("left", leftPos);
  $("#definitionsModal").css("top", topPos);
  $("#definitionsModal").removeClass("hide");
};

app.startOver = function () {
  app.clearFields();
  $(".searchForm").removeClass("hide");
  $(".sentenceContainer").empty();
  $(".instructions").text(
    "To start: Type a sentence that is in need of a fresh perspective, and submit!"
  );
  $(".startOver").addClass("hide");
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

  // on search form submission, display sentence and listen for word clicks
  $(".searchForm").on("submit", function (e) {
    e.preventDefault();
    const sentence = $("#searchField").val().trim();
    app.displaySentence(sentence);
    app.wordClickListener();
  });
};

$(function () {
  app.init();
});
