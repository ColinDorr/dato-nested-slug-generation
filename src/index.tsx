// @ts-nocheck
import { connect, IntentCtx, RenderFieldExtensionCtx } from 'datocms-plugin-sdk';
import { buildClient } from "@datocms/cma-client-browser";
import { render } from './utils/render';
import ConfigScreen from './entrypoints/ConfigScreen';
import SlugExtension from "./entrypoints/SlugExtension";
import 'datocms-react-ui/styles.css';
import updateAllChildrenSlugs from "./utils/updateAllChildrenSlugs";
// Collection of all slug data variables

const handelNestedContent = async (createOrUpdateItemPayload, ctx) => {
  if (ctx.plugin.attributes.parameters.onPublish) {
    return false;
  }
  
  // Get Slug field_key and field_prefix. 
  // Exclude fields with a active slug validator settings.
  const valid_slug_fields = (await ctx.loadFieldsUsingPlugin()).filter((field) => { 
    return !field.attributes.validators?.slug_format
  });

  // When no field use the plugin, return to normal
  if (!valid_slug_fields || valid_slug_fields.length === 0) { return false; };

  // Check if valid slug field is updated
  const updatedField = createOrUpdateItemPayload;
  const modelId = createOrUpdateItemPayload.data.relationships!.item_type!.data.id;
  let field_settings = valid_slug_fields.filter((field) => { return field.relationships!.item_type!.data.id === modelId });
  if(!field_settings || field_settings.length === 0) { return false; };
  field_settings = field_settings[0];

  // Generate changed object with all needed data
  const changed = {};
  const key = field_settings.attributes.label;
  const apiToken = ctx.currentUserAccessToken as string;
  
  changed.children = [];
  changed.parents = [];
  changed.settings = {
    client: await buildClient({ apiToken: apiToken }),
    api_token: apiToken,
    model_id: modelId
  }
  changed.field = {
    id: field_settings.id,
    update_id: createOrUpdateItemPayload.data.id,
    key: key,
    value: updatedField.data.attributes[key],
    attributes: field_settings?.attributes,
    localized: field_settings?.attributes?.localized,
    prefix: field_settings?.attributes?.appearance?.parameters?.url_prefix,
    locales: typeof updatedField.data.attributes[key] === "object" ? Object.keys(updatedField.data.attributes[key]) : null
  }
  
  // Start updating all tree items
  return await updateAllChildrenSlugs( changed );
}

connect({
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
  async onBeforeItemUpsert(createOrUpdateItemPayload, ctx) {
    const changeList = await handelNestedContent(createOrUpdateItemPayload, ctx);

    if(changeList && changeList.length) {
      console.log("_______Changed_slugs________");
      console.log(changeList);
      console.log("____________________________");
      // ctx.notice(
      //   `The slug of ${changeList[0].title} and children was updated. Please republish all pages to make the changes final`
      // );
      return true
    }
    // Continue normal dato functionalities.
    return true;
  },
});
