$(document).ready(function () {
  const loadingOverlay = document.getElementById("loading-overlay");
  const apiUrl = "https://api.jailbreakchangelogs.xyz/get_changelogs";
  const imageElement = document.getElementById("sidebarImage");
  const sectionsElement = document.getElementById("content");
  const titleElement = document.getElementById("changelogTitle");

  let changelogsData = [];

  function showLoadingOverlay() {
    loadingOverlay.classList.add("show");
  }

  function hideLoadingOverlay() {
    loadingOverlay.classList.remove("show");
  }

  showLoadingOverlay();

  const preprocessMarkdown = (markdown) =>
    markdown
      .replace(/ - /g, "\n- ")
      .replace(/ - - /g, "\n- - ")
      .replace(/## /g, "\n## ")
      .replace(/### /g, "\n### ")
      .replace(/\(audio\) /g, "\n(audio) ")
      .replace(/\(video\) /g, "\n(video) ")
      .replace(/\(image\) /g, "\n(image) ");

  function dismissKeyboard() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  const $searchInput = $('input[aria-label="Search changelogs"]');
  const $searchButton = $("#button-addon2");
  const $clearButton = $("#clear-search-button");

  $searchButton.on("click", performSearch);
  $searchInput.on("keyup", (e) => {
    if (e.key === "Enter") {
      performSearch();
      dismissKeyboard();
    }
    toggleClearButton();
  });

  $clearButton.on("click", clearSearch);

  function toggleClearButton() {
    $clearButton.toggle($searchInput.val().length > 0);
  }

  function hideSearchResults() {
    $("#search-results").hide();
    $searchInput.focus();
  }

  function clearSearch() {
    $searchInput.val("");
    toggleClearButton();
    hideSearchResults();
    dismissKeyboard();
  }

  const convertMarkdownToHtml = (markdown) => {
    return markdown
      .split("\n")
      .map((line) => {
        line = line.trim();
        if (line.startsWith("# ")) {
          return `<h1 class="display-4 mb-4 text-primary border-bottom border-primary pb-2">${wrapMentions(
            line.substring(2)
          )}</h1>`;
        } else if (line.startsWith("## ")) {
          return `<h2 class="display-5 mt-5 mb-3 text-warning">${wrapMentions(
            line.substring(3)
          )}</h2>`;
        } else if (line.startsWith("### ")) {
          return `<h3 class="display-6 mt-4 mb-3">${wrapMentions(
            line.substring(4)
          )}</h3>`;
        } else if (line.startsWith("- - - ")) {
          return `<p class="mb-2 lead ps-5 position-relative"><i class="bi bi-arrow-right position-absolute start-0 ps-4 text-primary"></i> ${wrapMentions(
            line.substring(6)
          )}</p>`;
        } else if (line.startsWith("- - ")) {
          return `<p class="mb-2 lead ps-5 position-relative"><i class="bi bi-arrow-return-right position-absolute start-0 ps-4 text-primary"></i> ${wrapMentions(
            line.substring(4)
          )}</p>`;
        } else if (line.startsWith("- ")) {
          return `
  <div class="d-flex align-items-start mb-2">
    <i class="bi bi-arrow-right text-primary me-2 fs-4"></i>
    <p class="lead mb-0">${wrapMentions(line.substring(2))}</p>
  </div>
  `;
        } else if (line.startsWith("(audio)")) {
          const audioUrl = line.substring(7).trim();
          const audioType = audioUrl.endsWith(".wav")
            ? "audio/wav"
            : "audio/mpeg";
          return `<audio class="w-100 mt-2 mb-2" controls><source src="${audioUrl}" type="${audioType}"></audio>`;
        } else if (line.startsWith("(image)")) {
          const imageUrl = line.substring(7).trim();
          return `<img src="${imageUrl}" alt="Image" class="img-fluid mt-2 mb-2" style="max-height: 500px;">`;
        } else if (line.startsWith("(video)")) {
          const videoUrl = line.substring(7).trim();
          return `<video class="w-100 mt-2 mb-2" style="max-height: 500px;" controls><source src="${videoUrl}" type="video/mp4"></video>`;
        } else {
          return `
  <div class="d-flex align-items-start mb-2">
    <p class="lead mb-0">${wrapMentions(line)}</p>
  </div>
  `;
        }
      })
      .join("");
  };

  const wrapMentions = (text) => {
    return text.replace(
      /@(\w+)/g,
      '<span class="mention fw-bold"><span class="at">@</span><span class="username">$1</span></span>'
    );
  };

  $.getJSON(apiUrl)
    .done((data) => {
      console.log("Data received:", data);
      changelogsData = data;

      if (Array.isArray(data) && data.length > 0) {
        const savedId = localStorage.getItem("selectedChangelogId");
        const idFromUrl = new URLSearchParams(window.location.search).get("id");
        const initialChangelog =
          changelogsData.find((cl) => cl.id == (idFromUrl || savedId)) ||
          changelogsData[0];
        displayChangelog(initialChangelog);
      } else {
        console.error("No changelogs found.");
      }

      hideLoadingOverlay();
    })
    .fail((jqXHR, textStatus, errorThrown) => {
      console.error("Error fetching changelogs:", errorThrown);
      $("#content").html(
        "<p>Error loading changelogs. Please try again later.</p>"
      );
      hideLoadingOverlay();
    });

  function performSearch() {
    const query = $searchInput.val().trim().toLowerCase();
    if (query) {
      const searchResults = changelogsData.filter((changelog) => {
        const titleMatch = changelog.title.toLowerCase().includes(query);
        const contentMatch =
          changelog.sections &&
          typeof changelog.sections === "string" &&
          changelog.sections.toLowerCase().includes(query);
        return titleMatch || contentMatch;
      });

      displaySearchResults(searchResults);
    } else {
      hideSearchResults();
    }
    dismissKeyboard();
  }

  function displaySearchResults(results) {
    const $searchResultsContainer = $("#search-results");
    $searchResultsContainer.empty();

    if (results.length === 0) {
      $searchResultsContainer.html('<p class="p-3">No results found.</p>');
    } else {
      const $resultsList = $("<ul>").addClass("list-group list-group-flush");
      results.forEach((changelog) => {
        const $listItem = $("<li>").addClass(
          "list-group-item search-result-item custom-search-item"
        );

        const cleanedSections = cleanContentForSearch(changelog.sections);
        const previewText =
          cleanedSections.substring(0, 100) +
          (cleanedSections.length > 100 ? "..." : "");

        const hasVideo = changelog.sections.includes("(video)");
        const hasImage = changelog.sections.includes("(image)");
        const hasAudio = changelog.sections.includes("(audio)");

        const mediaTags = [];
        if (hasVideo)
          mediaTags.push('<span class="media-tag video-tag">Video</span>');
        if (hasImage)
          mediaTags.push('<span class="media-tag image-tag">Image</span>');
        if (hasAudio)
          mediaTags.push('<span class="media-tag audio-tag">Audio</span>');

        $listItem.html(`
          <h5 class="mb-1">${changelog.title} ${mediaTags.join(" ")}</h5>
          <p class="mb-1 small">${previewText}</p>
        `);

        $listItem.on("click", () => {
          displayChangelog(changelog);
          clearSearch();
          dismissKeyboard();
        });

        $resultsList.append($listItem);
      });
      $searchResultsContainer.append($resultsList);
    }
    $searchResultsContainer.show();
  }

  function cleanContentForSearch(content) {
    return content
      .replace(/- /g, " ") // Replace " - " with a space
      .replace(/- - /g, " ") // Replace " - - " with a space
      .replace(/### /g, " ") // Replace "### " with a space
      .replace(/\(audio\) /g, " ") // Replace "(audio) " with a space
      .replace(/\(video\) /g, " ") // Replace "(video) " with a space
      .replace(/\(image\) /g, " ") // Replace "(image) " with a space
      .replace(/\(audio\)\s*\S+/g, "[Audio]") // Replace audio links with [Audio]
      .replace(/\(video\)\s*\S+/g, "[Video]") // Replace video links with [Video]
      .replace(/\(image\)\s*\S+/g, "[Image]") // Replace image links with [Image]
      .replace(/@(\w+)/g, "@$1") // Keep mentions as is
      .replace(/\s+/g, " ") // Replace multiple spaces with a single space
      .trim(); // Remove leading and trailing whitespace
  }
  const displayChangelog = (changelog) => {
    history.pushState(null, "", `?id=${changelog.id}`);
    localStorage.setItem("selectedChangelogId", changelog.id);

    document.title = `Jailbreak Changelog: ${changelog.title}`;
    if (titleElement) {
      titleElement.textContent = changelog.title;
    }

    if (changelog.image_url) {
      imageElement.src = changelog.image_url;
      imageElement.alt = `Image for ${changelog.title}`;
      imageElement.style.display = "block";
    } else {
      imageElement.src = "";
      imageElement.alt = "No image available";
      imageElement.style.display = "none";
    }

    let contentHtml = `<h1 class="display-4 mb-4">${changelog.title}</h1>`;

    if (changelog.sections) {
      const processedMarkdown = preprocessMarkdown(changelog.sections);
      const processedSections = convertMarkdownToHtml(processedMarkdown);
      contentHtml += processedSections;
    } else {
      console.warn("No sections available for changelog.");
      contentHtml += '<p class="lead">No sections available.</p>';
    }

    sectionsElement.innerHTML = contentHtml;
  };
});
