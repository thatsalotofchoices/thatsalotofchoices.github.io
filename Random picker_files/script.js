// Parse URL parameters.
function getURLParameters() {
  // Get the query string part of the URL (everything after the '?').
  const queryString = window.location.search;
  // Create an empty object to store the parameters.
  const params = {};
  // If there's a query string, parse it.
  if (queryString) {
    // Remove the leading '?' and split the query string into key-value pairs.
    const keyValuePairs = queryString.substring(1).split('&');
    // Iterate over each key-value pair.
    for (let i = 0; i < keyValuePairs.length; i++) {
      // Split each pair into key and value.
      const [key, value] = keyValuePairs[i].split('=');
      // Store the key-value pair in the 'params' object.
      params[key] = value;
    }
  }

  // Return the object containing the URL parameters.
  return params;
}

// Call the function to get the parameters.
const params = getURLParameters();

// Update the placeholder link.
function updatePlaceholderLink() {
  // Get the relevant input fields and the link element.
  const threadInput = document.getElementById("threadInput");
  const postInput = document.getElementById("postInput");
  const placeholderLink = document.getElementById("placeholder-link");

  // Get the seed value.
  const threadValue = threadInput.value;
  const postValue = postInput.value;

  // Handle invalid (empty) seed.
  if (!threadInput && !postInput) {
    placeholderLink.href = ""; // Clear the link.
    placeholderLink.textContent = "Anon... Where's the seed?"; // Error message.
    return; // Exit early.
  }

  // Construct the initial link.
  let link = `${window.location.origin}${window.location.pathname}?thread=${threadValue}&post=${postValue}`;

  // Set the link and text.
  placeholderLink.href = link;
  placeholderLink.textContent = link;
}

// Get the input elements.
const threadInput = document.getElementById("threadInput");
const postInput = document.getElementById("postInput");

// Add event listeners for input changes.
threadInput.addEventListener("input", updatePlaceholderLink);
postInput.addEventListener("input", updatePlaceholderLink);

// Initial update of the placeholder link.
updatePlaceholderLink();

// Generate a pseudo-random number influenced by entry content and order.
function generateEntryInfluencedRandomNumber(seed, decodedEntries) {
  // LCG constants
  const a = 1664525;
  const c = 1013904223;
  const m = Math.pow(2, 32); // 2^32
  // Calculate the total score based on entry content and position.
  let totalScore = 0;
  for (let i = 0; i < decodedEntries.length; i++) {
    let entryScore = 0;
    for (let j = 0; j < decodedEntries[i].length; j++) {
      entryScore = entryScore + decodedEntries[i].codePointAt(j);
    }
    // Multiply by position (starting from 1).
    entryScore = entryScore * (i + 1);
    totalScore = totalScore + entryScore;
  }
  // Scale totalScore to have the same number of digits as the seed.
  const seedDigits = seed.toString().length;
  const totalScoreDigits = totalScore.toString().length;
  if (totalScoreDigits < seedDigits) {
    const digitDifference = seedDigits - totalScoreDigits;
    totalScore = totalScore * Math.pow(10, digitDifference);
  }
  // Incorporate the total score into the LCG calculation.
  let randomNumber = (a * (seed + totalScore) + c) % m;
  // Adjust the number to fit the range 1 to numEntries (inclusive).
  randomNumber = (randomNumber % decodedEntries.length) + 1;
  return randomNumber;
}

const imageFilenames = [];
for (let i = 1; i <= 156; i++) {
  imageFilenames.push(`https://sprites.neocities.org/choice/icons/${i}.png`);
}

// Function to shuffle and trim the image array based on a seed.
function shuffleAndTrimImageArray(imageArray, seed, numEntries) {
  // Create a copy of the array to avoid modifying the original.
  const shuffledArray = imageArray.slice();
  // LCG-based random number generator for shuffling (simplified).
  function generateSeededRandom(currentSeed) {
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);
    // The next line is adapted to return a number between 0 and 1:
    return ((a * currentSeed + c) % m) / m;
  }
  // Fisher-Yates Shuffle algorithm (modified to use the seed).
  let currentSeed = seed; // Initialize the seed for shuffling.
  for (let i = shuffledArray.length - 1; i > 0; i--) {
    // Generate a random index based on the current seed.
    const j = Math.floor(generateSeededRandom(currentSeed) * (i + 1));

    // Swap elements at i and j.
    [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];

    // Update the seed for the next iteration to ensure a unique sequence.
    currentSeed = Math.floor(generateSeededRandom(currentSeed) * 100000);
  }
  // Trim the array to match the number of entries.
  return shuffledArray.slice(0, numEntries);
}

// Function to display the visualizer and run the animation.
async function displayVisualizer() {
  // Check if the necessary URL parameters are present.
  if (!params.thread || !params.post) {
    return; // Exit early if parameters are missing.
  }

  // Get the randomizer container.
  const randomizerContainer = document.getElementById("randomizer");

  // Clear the existing content of the randomizer container.
  randomizerContainer.innerHTML = "";

  // Add a class to the body to indicate that a pick is in progress.
  document.body.classList.add("picked");

  // Parse the entries parameter.
  // const encodedEntries = params.entries.split(",");
  // const decodedEntries = [];
  // for (let i = 0; i < encodedEntries.length; i++) {
  //   decodedEntries.push(decodeURIComponent(encodedEntries[i]));
  // }

  const threadDetails = await (await fetch(`https://arch.b4k.dev/_/api/chan/thread/?board=vg&num=${params.thread}`)).json();
  const postDetails = threadDetails[(Object.keys(threadDetails)[0])].posts;

  let post750 = postDetails[(Object.keys(postDetails)[749])];

  let i = 0;
  let postIDs;
  while (true) {
    postIDs = Object.keys(postDetails).filter(p => !(postDetails[p].deleted === "1" && postDetails[p].timestamp_expired < post750.timestamp));
    if (postIDs[749] == post750.num) {
      break;
    }
    i++;
    if (i > 1000) {
      return
    }

    post750 = postDetails[postIDs[749]]
  }

  const seed = postIDs[749];  // 0 indexed, this is 750

  const validPostIDs = postIDs.slice(0, 750).filter(p => postDetails[p].comment?.includes(`>>${params.post}`))
  const decodedEntries = validPostIDs.map(p => postDetails[p].comment.replace(`>>${params.post}`, "").trim())

  console.log(`Seed is ${seed}`);
  console.log("So the options are:\n\n" + decodedEntries.join('\n'));

  // Check for the 'skip' parameter and convert it to a boolean.
  const skipAnimation = (params.skip === "true");

  // Check if a bg parameter is provided in the URL.
  if (params.bg) {
    let bgUrl = params.bg;
    if (/^[a-z0-9]{6}\.[a-z]{2,5}$/.test(params.bg)) { // Check for Catbox filename pattern
      bgUrl = `https://files.catbox.moe/${params.bg}`;
    }
    document.body.style.backgroundImage = `url('${bgUrl}')`;
  }

  // Generate the random number to determine the winning index.
  const winningIndex = generateEntryInfluencedRandomNumber(seed, decodedEntries);
  console.log("And the winner is...", decodedEntries[winningIndex - 1]);

  // Shuffle and trim the image array.
  const selectedImages = shuffleAndTrimImageArray(imageFilenames, seed, decodedEntries.length);

  // Create and append entry divs to the randomizer container.
  for (let i = 0; i < decodedEntries.length; i++) {
    // Create the main entry container.
    const entryContainer = document.createElement("div");
    entryContainer.classList.add("entry-container");

    // Create the icon container.
    const iconContainer = document.createElement("div");
    iconContainer.classList.add("icon-container");

    // Create the image element.
    const imageElement = document.createElement("img");
    if (imageMap.hasOwnProperty(decodedEntries[i])) {
      // Use the hardcoded image.
      imageElement.src = `https://sprites.neocities.org/choice/icons/${imageMap[decodedEntries[i]]}`;
    } else {
      // Use the shuffled image.
      imageElement.src = selectedImages[i];
    }
    // Append the image to the icon container.
    iconContainer.appendChild(imageElement);

    // Create the entry name container.
    const entryNameContainer = document.createElement("div");
    entryNameContainer.classList.add("entry-name");

    // Create the "Anonymous" span.
    const anonymousSpan = document.createElement("span");
    anonymousSpan.textContent = "Anonymous";
    entryNameContainer.appendChild(anonymousSpan);

    // Create the post number span.
    const postNumSpan = document.createElement("span");
    postNumSpan.textContent = "No." + validPostIDs[i];
    entryNameContainer.appendChild(postNumSpan);

    // Create the text div.
    const textDiv = document.createElement("div");
    textDiv.textContent = decodedEntries[i];
    textDiv.classList.add("entry-text");

    // Append the icon container, entry name, and text div to the main container.
    entryContainer.appendChild(iconContainer);
    entryContainer.appendChild(entryNameContainer);
    entryContainer.appendChild(textDiv);

    // Add the 'entry-folded' class for the initial state.
    if (!skipAnimation) {
      entryContainer.classList.add("entry-folded");
    }

    // Append the main container to the randomizer container.
    randomizerContainer.appendChild(entryContainer);
  }

  // ANIMATION LOGIC

  // Configuration Variables
  const minUnfoldDuration = 500; // Minimum duration for unfolding animation (ms).
  const maxUnfoldDuration = 5000; // Maximum duration for unfolding animation (ms).
  const minCycleDuration = 1000; // Minimum duration for a single cycle (ms).
  const maxCycleDuration = 5000; // Maximum duration for a single cycle (ms).
  const minWinnerDuration = 500; // Minimum duration for winner's rising (ms).
  const maxWinnerDuration = 3000; // Maximum duration for winner's rising (ms).
  const numCycles = 3; // Number of full animation cycles.

  // Get all entry divs.
  const entryDivs = randomizerContainer.querySelectorAll(".entry-container");

  // Immediately reveal the winner if 'skipAnimation' is true.
  if (skipAnimation) {
    entryDivs[winningIndex - 1].classList.add("winner");
    // Move directly to the top.
    const randomizerContainer = document.getElementById("randomizer");
    const winningEntry = entryDivs[winningIndex - 1];
    randomizerContainer.insertBefore(winningEntry, randomizerContainer.children[0]);
  } else {

    // Entry Unfolding Animation

    // Calculate the total unfolding duration.
    const numEntries = entryDivs.length;
    let unfoldDuration = numEntries * 100; // 100ms per entry for the unfold.
    // Clamp the duration between the minimum and maximum values.
    unfoldDuration = Math.min(Math.max(unfoldDuration, minUnfoldDuration), maxUnfoldDuration);

    // Apply the unfolding animation with dynamic delays.
    for (let i = 0; i < numEntries; i++) {
      const entryDiv = entryDivs[i];
      // Calculate the transition delay for each entry.
      const transitionDelay = (unfoldDuration / numEntries) * i;
      // Apply the 'entry-appear' class and set the inline style for transition-delay.
      entryDiv.style.transitionDelay = transitionDelay + "ms"; // Set inline style.
      // Introduce a small delay before adding 'entry-appear'.
      setTimeout(function() {
        entryDiv.classList.add("entry-appear");
      }, 10); // 10ms delay.
    }

    // Selection Cycle Animation

    // Handle the 'transitionend' event.
    function handleTransitionEnd(event) {
      // Check if the event is coming from a transition we applied so the logic wouldn't be triggered for each property transition.
      if (event.propertyName === "transform") {
        // Removes 'entry-folded' and 'entry-appear' classes from all entry divs.
        for (let i = 0; i < entryDivs.length; i++) {
          entryDivs[i].classList.remove("entry-folded", "entry-appear");
          entryDivs[i].removeAttribute('style');
        }
        startSelectionAnimation();
        // Self-disconnect the event listener.
        entryDivs[numEntries - 1].removeEventListener("transitionend", handleTransitionEnd);
      }
    }
    // Attach a 'transitionend' event listener to the last entry.
    entryDivs[numEntries - 1].addEventListener("transitionend", handleTransitionEnd);

    // Start the selection animation.
    function startSelectionAnimation() {

      // Initialize variables.
      let currentDivIndex = 0;
      let cycleCount = 0;
      const numEntries = entryDivs.length;

      // Calculate the target duration for a cycle.
      let cycleDuration = numEntries * 50; // 50ms per entry as a base.
      cycleDuration = Math.min(Math.max(cycleDuration, minCycleDuration), maxCycleDuration);

      // Calculate the initial delay (time per entry for a full cycle).
      const baseDelay = cycleDuration / numEntries;

      let delay = baseDelay; // Initial delay.

      // Function to perform the animation (recursive with setTimeout).
      function animateSelection() {

        // Highlight the current entry.
        entryDivs[currentDivIndex].classList.add("selection-frame");

        // Remove highlight from the previous entry.
        if (currentDivIndex > 0) {
          entryDivs[currentDivIndex - 1].classList.remove("selection-frame");
        } else if (cycleCount > 0) {
          // Remove highlight from the last entry of the previous cycle.
          entryDivs[entryDivs.length - 1].classList.remove("selection-frame");
        }

        // Move to the next entry.
        currentDivIndex++;

        // Check if the animation should stop.
        if (cycleCount === numCycles && currentDivIndex === winningIndex) {
          console.log("Selection animation finished.");
          entryDivs[winningIndex - 1].classList.remove("selection-frame");
          entryDivs[winningIndex - 1].classList.add("winner");
          // Add a delay before calling revealWinner.
          const revealDelay = 1000;
          setTimeout(revealWinner, revealDelay);
          return; // Stop the animation.
        }

        // Check for cycle completion.
        if (currentDivIndex === entryDivs.length) {
          currentDivIndex = 0;
          cycleCount++;
        }

        // Calculate dynamic delay (only in the final cycle).
        if (cycleCount === numCycles) {
          const delayFactor = Number((1 - (currentDivIndex / winningIndex)).toFixed(1)); // Clamp to one decimal place.
          delay = baseDelay + (baseDelay * (1 - delayFactor) * numEntries);
          delay = Math.round(delay); // Round to the nearest integer.
        } else {
          delay = baseDelay;
        }

        // Call the next iteration with the calculated delay.
        setTimeout(animateSelection, delay);
      }

      // Start the animation.
      animateSelection();
    }

    // Reveal the winner.
    function revealWinner() {
      const randomizerContainer = document.getElementById("randomizer");
      const winningEntry = document.querySelector(".winner");
      const entriesAboveWinner = winningIndex - 1;
      // Calculate the total duration for the winner to rise, based on the number of steps.
      let winnerDuration = entriesAboveWinner * 200; // delay per step
      winnerDuration = Math.min(Math.max(winnerDuration, minWinnerDuration), maxWinnerDuration);
      // Calculate the delay between each "bubbling up" step.
      const stepDelay = winnerDuration / entriesAboveWinner;
      let currentPosition = winningIndex - 1; // Start at the winner's initial index.
      function moveWinnerUp() {
        if (currentPosition > 0) {
          const precedingElement = randomizerContainer.children[currentPosition - 1];
          randomizerContainer.insertBefore(winningEntry, precedingElement);
          currentPosition--;
          setTimeout(moveWinnerUp, stepDelay);
        } else {
          console.log("Winner reached the top.");
        }
      }
      moveWinnerUp();
    }
  }

}

// Image mapping (entry text -> image filename).
var imageMap = {
  "janku": "suigintou.png",
  "kashira": "kanaria.png",
  "desu": "suiseiseki.png",
  "boku": "souseiseki.png",
  "dawa": "shinku.png",
  "nano": "hinaichigo.png",
  "unyuu": "hinaichigo.png",
  "masta": "kirakishou.png",
  "bokudes": "bokudes.png",
  "dody": "dody.png",
  "cai": "blueguy.png"
};

// Call the display function.
displayVisualizer();