import { parseMonsterCore } from "./monsterParser.js";
import { parseAbilities } from "./itemParser.js";

class MonsterImportUI extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "monster-importer",
      title: game.i18n.localize("DRAWSTEELIMPORTER.ImportMonster"),
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
      return ui.notifications.warn(game.i18n.localize("DRAWSTEELIMPORTER.Notification.NoFile"));
    }

    let rawData;
    try {
      rawData = JSON.parse(this.fileContent);
    } catch (err) {
      return ui.notifications.error(game.i18n.localize("DRAWSTEELIMPORTER.Notification.InvalidJSON"));
    }

    const actorData = parseMonsterCore(rawData);
    // actorData.items = parseAbilities(rawData.abilities || []);

console.log("Actor Data:", actorData);



try {
  const actor = await Actor.create(actorData, { renderSheet: true });
  ui.notifications.info(`Imported: ${actor.name}`);
} catch (err) {
  console.error("Actor creation failed:", err);
  ui.notifications.error("Failed to import monster. Check console for details.");
}
  }
}
 

// Inject button into Actor Directory
Hooks.on("renderActorDirectory", (app, html, data) => {
  const $html = $(html);
  const button = $(`<button class="import-monster-button">
    <i class="fas fa-file-import"></i> ${game.i18n.localize("DRAWSTEELIMPORTER.ImportMonster")}
  </button>`);

  button.click(() => new MonsterImportUI().render(true));

  $html.find(".directory-footer").append(button);
});

