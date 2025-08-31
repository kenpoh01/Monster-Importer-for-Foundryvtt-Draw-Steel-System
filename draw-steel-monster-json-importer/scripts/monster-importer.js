import { parseMonsterCore } from "./monsterParser.js";
import { parseItems } from "./itemParser.js";

class MonsterImportUI extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "monster-importer",
      title: "Import Monster",
      template: "modules/draw-steel-monster-json-importer/templates/import.ui.html",
      width: 400,
      classes: ["monster-importer"]
    });
  }

  getData() {
    return {};
  }

  activateListeners(html) {
    html.find("#monster-file").on("change", async (event) => {
      const file = event.target.files[0];
      if (!file) {
        ui.notifications.warn("No file selected.");
        return;
      }

      try {
        this.fileContent = await file.text();
        console.log("✅ File loaded:", file.name);
      } catch (err) {
        console.error("❌ Failed to read file:", err);
        ui.notifications.error("Could not read file.");
      }
    });

    html.find("#import-button").on("click", () => {
      this._importMonster();
    });
  }

async _importMonster() {
  console.log("✅ Batch import triggered.");

  const fileInput = document.querySelector("#monster-file");
  const folderName = document.querySelector("#monster-folder")?.value?.trim();
  const files = Array.from(fileInput?.files || []);

  if (!fileInput || files.length === 0) {
  ui.notifications.warn("No monster files selected. Please choose one or more .json files.");
  console.warn("⚠️ Import aborted: No files selected.");
  return;
}



  // Create or find folder
  let folder;
  if (folderName) {
    folder = game.folders.find(f => f.name === folderName && f.type === "Actor");
    if (!folder) {
      try {
        folder = await Folder.create({
          name: folderName,
          type: "Actor",
          parent: null,
          color: "#4b4a44"
        });
        console.log(`✅ Created folder: ${folderName}`);
      } catch (err) {
        console.error("❌ Folder creation failed:", err);
        ui.notifications.error("Could not create folder.");
        return;
      }
    }
  }

  for (const file of files) {
    try {
      const content = await file.text();
      const rawData = JSON.parse(content);
      const actorData = parseMonsterCore(rawData);
      actorData.items = parseItems(rawData.traits || [], rawData.abilities || [], rawData);


      if (!actorData.name || !actorData.system || !Array.isArray(actorData.items)) {
        console.warn(`⚠️ Skipped malformed file: ${file.name}`);
        continue;
      }

      const actor = await Actor.create({
        ...actorData,
        folder: folder?.id || null
      });

      if (actor) {
        console.log(`✅ Imported: ${actor.name}`);
        ui.notifications.info(`Imported: ${actor.name}`);
      }
    } catch (err) {
      console.error(`❌ Failed to import ${file.name}:`, err);
      ui.notifications.warn(`Failed to import ${file.name}`);
    }
  }

  this.close();
}
}


// Inject button into Actor Directory
Hooks.on("renderActorDirectory", (app, html, data) => {
  const $html = $(html);
  const button = $(`<button class="import-monster-button">
    <i class="fas fa-file-import"></i> Import Monster
  </button>`);

  button.click(() => new MonsterImportUI().render(true));

  $html.find(".directory-footer").append(button);
});