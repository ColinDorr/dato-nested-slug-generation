// @ts-nocheck
import { LogLevel, buildClient } from "@datocms/cma-client-browser";

interface SlugFieldData {
  field_locales: {} | string | null;
  field_key: string | null;
  field_prefix: string | null;
  field_updated: any | null;
  field_updated_id: string | null;
}

// Variabled
const globals = {
  client: null,
  modelID: null,
  apiToken: null,
  field_key:null,
  prefix: null
} 

// Returns Array with locales keys (multi-language) or null (single langauge) 
// ['de', 'nl-Nl']
const getLocales = (field) =>  {
  if (field && typeof field === "object") {
    return Object.keys(field)
  }
  return null
}

// Const pass path of url and only returns last segment 
// /locaties/amsterdam/kauwgomballenkwartier?test#loc-1 => kauwgomballenkwartier
const getUriSegment = (text:string) =>  {
  if(!text) { return null }
  let segment = text.split('/').filter( i => i.length > 0 );
  return segment[segment.length - 1].split('?')[0].split('#')[0];
}

const loopTroughParentsSlugs = (record, locale) => {
  const params = [];
  // let current_parent = record;
  // while (current_parent) {
  //   params.unshift( 
  //     getUriSegment(current_parent[globals.field_key][locale])
  //   );
  // }
  // if(globals.prefix){
  //   params.unshift( 
  //     getUriSegment(globals.prefix)
  //   );
  // }
  // console.log(params)
  return params
}

const generateNewUri = (record, locale) => {
  console.log("generateNewUri")
  let params = [];
  if (locale && typeof record[globals.field_key] === "object" && record[globals.field_key].hasOwnProperty(locale)) {
    // params = loopTroughParentsSlugs(record, locale)
  } 
  else if (typeof record[globals.field_key] !== "object") {
    // params = loopTroughParentsSlugs(record, locale)
  }
  return params
}



// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Date queries and generation of nested contend
// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const getParentOfRecord = async (childRecord, client = globals.client, modelID = globals.modelID, ) => {
  if(!childRecord.parent_id) { return null }

  const getParentRecord = await client.items.list({
    filter: {
      type: modelID,
      fields: {
        id: {
          eq: childRecord.parent_id,
        },
      },
    },
  });

  const parentRecord = getParentRecord?.[0] || null

  if (parentRecord) {
    const parentValue = parentRecord.parent_id ? undefined : null; 
    return await setRecordFields(parentRecord, parentValue, childRecord)
  }

  return parentRecord;
} 

const getChildrenOfRecord = async (parentRecord, client = globals.client, modelID = globals.modelID,) => {
  console.log("getChildrenOfRecord")
  const childRecords = await client.items.list({
    filter: {
      type: modelID,
      fields: {
        parent: {
          eq: parentRecord.id,
        },
      },
    },
  });

  if (childRecords.length) {
    childRecords.forEach(async (child) => {
      return await setRecordFields(child, parentRecord)
    });
  }
  return childRecords;
}

const setRecordFields = async (record, parent = undefined, children = undefined) => {
  record.uri = record.slug;

  record.parent = 
    parent === undefined 
      ? await getParentOfRecord(record) 
      : parent;

  record.children = 
    children === undefined 
      ? await getChildrenOfRecord(record)
      : children;

  return record;
}

const getCurrentRecord = async (currentId) => {
  const record = await globals.client.items.list({
    filter: {
      type: globals.modelID,
      fields: {
        id: {
          eq: currentId,
        },
      },
    },
  });

  let currentRecord = record?.[0];
  if(currentRecord){
    currentRecord = await setRecordFields(
      currentRecord, // current record => RecordItem
      currentRecord.parent_id ? await getParentOfRecord( currentRecord ) : null, // parent record result => RecordItem | null
      await getChildrenOfRecord( currentRecord )  // Child records => [RecordItem] | []
    )
  }
  return currentRecord;
}

export default async function updateAllChildrenSlugs(
  apiToken: string, 
  modelId: string, 
  slug_field_data: SlugFieldData
) {

  // Define global accessible fields
  globals.client = buildClient({ apiToken });
  globals.modelID = modelId;
  globals.apiToken = apiToken;
  globals.field_key =  slug_field_data.field_key;
  globals.prefix = slug_field_data.field_prefix;

  // Get Current record with nested parent and child data
  const currentRecord = await getCurrentRecord( slug_field_data.field_updated.id );
  console.log(currentRecord)


  // console.log( generateNewUri(currentRecord, "nl-NL") );





  // console.log(client)

  // const records = await client.items.list({
  //   filter: {
  //     type: modelId,
  //     fields: {
  //       parent: {
  //         eq: slug_field_data.field_updated.id,
  //       },
  //     },
  //   },
  // });

  // console.log(records)
  
  // // Get all pages of same type
  // const allPageItems = (await client.items.list({
  //   filter: { type: modelId },
  // }));

  
  // // Generate page relation tree
  // const tree = generateTree( allPageItems, slug_field_data);
  // console.log("_________Tree_______");
  // console.log(tree);
  // console.log("____________________");
  
  // // Update page slug that was changed and all nested children
  // const changedPage = tree[slug_field_data.field_updated_id];
  let changedPagesList = [];
  // changedPagesList = getChangedPagesList(changedPage);
  // if(changedPagesList.length){
  //   changedPagesList.forEach(async (page) => {
  //     const locales = getLocales(slug_field_data, page);
  //     await updateEntry(client, page, slug_field_data, locales)
  //   });
  // }

  return changedPagesList;
}