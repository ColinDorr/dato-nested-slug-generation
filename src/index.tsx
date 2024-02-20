import { connect, ItemType, IntentCtx, RenderFieldExtensionCtx } from 'datocms-plugin-sdk';
import { render } from './utils/render';
import ConfigScreen from './entrypoints/ConfigScreen';
// import ParentSelection from './entrypoints/Sidebars/ParentSelection';
import SlugExtension from "./entrypoints/SlugExtension";
import 'datocms-react-ui/styles.css';
import updateAllChildrenSlugs from "./utils/updateAllChildrenSlugs";

const nestedData: {
  currentEntrySlug: null | string,
  parentPath: null | string,
  generatedSlug: null | string,
  slugKey: string
} = {
  currentEntrySlug: null,
  parentPath: null,
  generatedSlug: null,
  slugKey: "api_slug_field"
};


const getCurrentEntrySlugValue = (ctx: RenderFieldExtensionCtx) => {
 const currentEntrySlug = ctx.formValues?.[nestedData.slugKey] || null;
 if (typeof currentEntrySlug === 'string') { return currentEntrySlug; }
 return null;
}

connect({
  // async onBeforeItemsPublish(createOrUpdateItemPayload, ctx) {
  // async onBeforeItemUpsert(createOrUpdateItemPayload, ctx) {
  //   ctx.notice('Hi there!');
  //   return true
  // },

  // Render plugin config screen
  renderConfigScreen(ctx) {
    return render(<ConfigScreen ctx={ctx} />);
  },

  // Add plugin as field extension/presentation option
  manualFieldExtensions(ctx: IntentCtx) {
    return [
      {
        id: "nested_slug_generation",
        name: "Nested slug generation",
        type: "addon",
        fieldTypes: ["slug"],
      },
    ];
  },
  renderFieldExtension(fieldExtensionId: string, ctx: RenderFieldExtensionCtx) {
    switch (fieldExtensionId) {
      case "nested_slug_generation":
        nestedData.currentEntrySlug = getCurrentEntrySlugValue(ctx);
        return render(<SlugExtension ctx={ctx} />);
    }
  },

  async onBeforeItemUpsert(createOrUpdateItemPayload, ctx) {
    if (ctx.plugin.attributes.parameters.onPublish) {
      console.log("onPublish")
      return true;
    }

    let fieldUsingThisPlugin: Array<string> = [];

    // Generate list of fields using this plugin, but exclude fields with a active slug validator.
    (await ctx.loadFieldsUsingPlugin()).map((field) => {
      if(!field.attributes.validators?.slug_format){
        fieldUsingThisPlugin.push(field.attributes.api_key);
      }
    });

    // If no field use this plugin, continue normal dato functionalities.
    if (!fieldUsingThisPlugin) { return true; };

    // console.log(fieldUsingThisPlugin);
    (fieldUsingThisPlugin as Array<string>).forEach((field) => {
      updateAllChildrenSlugs(
        ctx.currentUserAccessToken as string,
        createOrUpdateItemPayload.data.relationships!.item_type!.data.id,
        (createOrUpdateItemPayload.data as any).id, //i shouldn't have to cast this to any
        field,
        createOrUpdateItemPayload.data.attributes![field] as string
      );
    });

    // Continue normal dato functionalities.
    return true;
  }

  // NICE TO have - select parent
  // itemFormSidebarPanels(model: ItemType, ctx: IntentCtx) {
  //   return [
  //     {
  //       id: 'Parent',
  //       label: 'Parent',
  //       startOpen: true,
  //       placement: ["before", "info"]
  //     },
  //   ];
  // },
  // renderItemFormSidebarPanel(sidebarPaneId, ctx) {
  //   render(<ParentSelection ctx={ctx} />);
  // },
});
