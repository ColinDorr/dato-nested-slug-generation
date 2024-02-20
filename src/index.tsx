// @ts-nocheck
import { connect, ItemType, IntentCtx, RenderFieldExtensionCtx } from 'datocms-plugin-sdk';
import { render } from './utils/render';
import ConfigScreen from './entrypoints/ConfigScreen';
// import ParentSelection from './entrypoints/Sidebars/ParentSelection';
import SlugExtension from "./entrypoints/SlugExtension";
import 'datocms-react-ui/styles.css';
import updateAllChildrenSlugs from "./utils/updateAllChildrenSlugs";

const handelNestedContent = async (createOrUpdateItemPayload, ctx) => {
  let fieldUsingThisPlugin: Array<string> = [];

  // Generate list of fields using this plugin, but exclude fields with a active slug validator.
  (await ctx.loadFieldsUsingPlugin()).map((field) => {
    if(!field.attributes.validators?.slug_format){
      fieldUsingThisPlugin.push(field.attributes.api_key);
    }
  });

  // If no field use this plugin, continue normal dato functionalities.
  if (!fieldUsingThisPlugin) { return true; };


  // Check if field is updated and is bound slug field
  const updatedFields = Object.keys(createOrUpdateItemPayload.data.attributes as object);
  let updatedField;
  (fieldUsingThisPlugin as Array<string>).forEach((field) => {
    if (updatedFields.includes(field)) {
      updatedField = createOrUpdateItemPayload.data;
      return;
    }
  });

  if (!updatedField) {
    return true;
  }
  
  // console.log(updatedField);

  // console.log(fieldUsingThisPlugin);
  // (   as Array<string>).forEach((field) => {
  //   updateAllChildrenSlugs(
  //     ctx.currentUserAccessToken as string,
  //     createOrUpdateItemPayload.data.relationships!.item_type!.data.id,
  //     field,
  //   );
  // });


  return updateAllChildrenSlugs(
    ctx.currentUserAccessToken as string,
    createOrUpdateItemPayload.data.relationships!.item_type!.data.id,
    updatedField,
  );
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
        return render(<SlugExtension ctx={ctx} />);
    }
  },
  

  // Update when page is saved
    // async onBeforeItemsPublish(createOrUpdateItemPayload, ctx) {
  async onBeforeItemUpsert(createOrUpdateItemPayload, ctx) {
    const changeList = handelNestedContent(createOrUpdateItemPayload, ctx);
    if(changeList.length) {
      console.log(changeList)
      ctx.notice(changeList.map(e => e.uri).join(', '));
    }
    // Continue normal dato functionalities.
    return true;
  },
});
