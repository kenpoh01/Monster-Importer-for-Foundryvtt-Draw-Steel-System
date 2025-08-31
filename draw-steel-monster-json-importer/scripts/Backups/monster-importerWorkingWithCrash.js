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
    html.find("form").on("submit", (event) => {
      event.preventDefault();
      this._importMonster();
    });

    html.find('input[type="file"]').on("change", async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      this.fileContent = await file.text();
    });
  }

  async _importMonster() {
    if (!this.fileContent) {
      ui.notifications.warn("No file selected.");
      return;
    }

    let rawData;
    try {
      rawData = JSON.parse(this.fileContent);
    } catch (err) {
      ui.notifications.error("Invalid JSON format.");
      return;
    }

    let actorData;
    try {
      actorData = parseMonsterCore(rawData);
      actorData.items = parseItems(rawData.traits || [], rawData.abilities || []);
    } catch (err) {
      console.error("Monster parsing failed:", err);
      ui.notifications.error("Failed to parse monster data.");
      return;
    }

    console.log("Actor Data:", actorData);

    // Validate actor structure
    if (!actorData.name || !actorData.system || !Array.isArray(actorData.items)) {
      ui.notifications.error("Actor data is incomplete. Import aborted.");
      return;
    }

    // Validate each item
    for (const item of actorData.items) {
      if (!item.name || !item.type || typeof item.system !== "object") {
        console.error("Invalid item structure:", item);
        ui.notifications.error(`Item "${item.name || "Unnamed"}" is malformed.`);
        return;
      }
    }

    try {
      const actor = await Actor.create(actorData);
      ui.notifications.info(`Imported: ${actor.name}`);
    } catch (err) {
      console.error("Actor creation failed:", err);
      ui.notifications.error("Failed to import monster. Check console for details.");
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
