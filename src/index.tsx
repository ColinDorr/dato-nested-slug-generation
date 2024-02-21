// @ts-nocheck
import { connect, IntentCtx, RenderFieldExtensionCtx } from 'datocms-plugin-sdk';
import { render } from './utils/render';
import ConfigScreen from './entrypoints/ConfigScreen';
import SlugExtension from "./entrypoints/SlugExtension";
import 'datocms-react-ui/styles.css';
import updateAllChildrenSlugs from "./utils/updateAllChildrenSlugs";

// Collection of all slug data variables
interface SlugFieldData {
  field_locales: {} | string | null;
  field_key: string | null;
  field_prefix: string | null;
  field_updated: any | null;
  field_updated_id: string | null;
}

const slug_field_data: SlugFieldData = {
  field_locales: null,
  field_key: null,
  field_prefix: null,
  field_updated: null,
  field_updated_id: null
};

const getFieldKey = (field) => {
  slug_field_data.field_key = field.attributes?.api_key;
}

const getFieldPrefix = (field) => {
  let slug_prefix = null
  if (field.attributes?.appearance?.parameters?.url_prefix) {
    const url_prefix = field.attributes.appearance.parameters.url_prefix;
    const clean_prefix = url_prefix.split("/").filter(e => e.length > 0);
    slug_prefix = clean_prefix.join("/");
  }
  slug_field_data.field_prefix = slug_prefix;
}

const getUpdatedField = async (createOrUpdateItemPayload) => {
  const updatedFields = Object.keys(createOrUpdateItemPayload.data.attributes as object);
  if (updatedFields.includes(slug_field_data.field_key)) {
    slug_field_data.field_updated = createOrUpdateItemPayload.data;
    slug_field_data.field_updated_id = createOrUpdateItemPayload.data.id;
    slug_field_data.field_locales = createOrUpdateItemPayload.data.attributes[slug_field_data.field_key];
    return;
  }
}

const handelNestedContent = async (createOrUpdateItemPayload, ctx) => {
  if (ctx.plugin.attributes.parameters.onPublish) {
    return true;
  }

  // Get Slug field_key and field_prefix. 
  // Exclude fields with a active slug validator settings.
  (await ctx.loadFieldsUsingPlugin()).map((field) => {
    if (!field.attributes.validators?.slug_format) {
      getFieldKey(field);
      getFieldPrefix(field);
    }
  });

  // When no field use the plugin, return to normal
  if (!slug_field_data.field_key) { return true; };

  // Check if valid slug field is updated
  getUpdatedField(createOrUpdateItemPayload);

  // If slug is not update, return to normal
  if (!slug_field_data.field_updated) { return true; }

  // Start updating all tree items
  const apiToken = ctx.currentUserAccessToken as string;
  const modelId = createOrUpdateItemPayload.data.relationships!.item_type!.data.id
  return updateAllChildrenSlugs(apiToken, modelId, slug_field_data);
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

    if(changeList.length) {
      ctx.notice(
        `The slug of /${changeList[0].uri} and children was updated. Please republish all pages to make the changes final`
      );
    }
    // Continue normal dato functionalities.
    return true;
  },
});
