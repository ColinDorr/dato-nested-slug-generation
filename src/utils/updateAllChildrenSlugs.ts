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
  field_updated:null,
  prefix: null,
  children: []
} 


// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Date formatting Helpers
// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
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

  let current_parent = record;
  while (current_parent) {
    let fieldValue = null;
    if (locale){
      fieldValue = globals.field_updated.id === current_parent.id ? globals.field_updated.attributes[globals.field_key][locale] : current_parent[globals.field_key][locale];
    } else {
      fieldValue = globals.field_updated.id === current_parent.id ? globals.field_updated.attributes[globals.field_key][locale] : current_parent[globals.field_key][locale];
    }
    params.unshift( 
      getUriSegment(fieldValue)
    );
    current_parent = current_parent.parent;
  }

  if(globals.prefix){
    params.unshift( 
      getUriSegment(globals.prefix)
    );
  }
  return params
}

const generateNewUri = (record, locale) => {
  let params = [];
  if (locale && typeof record[globals.field_key] === "object" && record[globals.field_key].hasOwnProperty(locale)) {
    params = loopTroughParentsSlugs(record, locale);
  } 
  else if (typeof record[globals.field_key] !== "object") {
    params = loopTroughParentsSlugs(record, locale);
  }

  // Return full slug
  if (params && params.includes(null)){
    return null
  }
  return params.join('/');
}

// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Date queries and generation of nested contend
// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const getParentOfRecord = async (childRecord, client = globals.client, modelID = globals.modelID, ) => {
  if(!childRecord.parent_id) { return null }

  const parentRecord = await client.items.find( childRecord.parent_id)

  if (parentRecord) {
    const parentValue = parentRecord.parent_id ? undefined : null; 
    return await setRecordFields(parentRecord, parentValue, childRecord)
  }

  return parentRecord;
} 

const getChildrenOfRecord = async (parentRecord, client = globals.client, modelID = globals.modelID,) => {
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
      const childRecord = await setRecordFields(child, parentRecord);
      globals.children.push(childRecord);
      return childRecord
    });
  }
  return childRecords;
}

const setRecordFields = async (record, parent = undefined, children = undefined) => {
  const locales = getLocales(record[globals.field_key]);
  const uriValue = locales ? {} : null;
  record.parent = 
  parent === undefined 
  ? await getParentOfRecord(record) 
  : parent;
  
  record.children = 
  children === undefined 
  ? await getChildrenOfRecord(record)
  : children;
  
  if (locales) {
    locales.forEach(async (locale) => {
      uriValue[locale] = generateNewUri(record, locale);
    });
  } else {
    uriValue = generateNewUri(record, locale);
  }
  record.uri = uriValue;


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


// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// DatoCMS mutations
// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const trowCatchUpdateEntry = async ( record, options, loop = 1, maxTries = 3) => {
  const client = buildClient({ apiToken: globals.apiToken });
  record = await client.items.find(record.id);
  console.log({
    record, options
  })

  try {
    await client.items.update(record.id, options);
    return { message: "success", record, options }
  }
  catch (e) {
    console.log(e)
    if(loop < maxTries){
      trowCatchUpdateEntry(record, options, loop + 1)
    }
    return { message: "failed", record, options, e };
    // throw e;
  }
}

const updateEntry = async (record) =>  {
  const locales = getLocales(record[globals.field_key]);
  let options = {}
  let allowUpdate = false;
  // Update current entry
  if(locales){
    locales.forEach( async (locale) => {
      const uri = record.uri && record.uri.hasOwnProperty(locale) && record.uri[locale] ? record.uri[locale] : null;
      options[locale] = {
        [globals.field_key] : uri
      }
      if(record.uri[locale]){
        allowUpdate = true
      }
    })
  } 
  else if(record.uri){
    options = {
      [globals.field_key] : record.uri ? uri : null
    }
    allowUpdate = true;
  }
  return allowUpdate ? await trowCatchUpdateEntry (record, options) : null;
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
  globals.field_key = slug_field_data.field_key;
  globals.field_updated= slug_field_data.field_updated;
  globals.prefix = slug_field_data.field_prefix;

  // Get Current record tree with nested parent and child data
  const currentRecord = await getCurrentRecord( slug_field_data.field_updated.id );
  const updatedTree = globals.children.length ? [currentRecord].concat(globals.children) : [currentRecord];

  updatedTree.forEach( async (record) => {
    const result = await updateEntry(record);
    console.log(result)
  });


  // TODO: 
  // - Add working update function
  // Update all records with their new slugs
  let changedPagesList = []
  // changedPagesList = await updateRecordAndChildren(currentRecord);
  return changedPagesList;
}