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
  prefix: null
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
const updateEntry = async (record, updateChildren = true) =>  {
  const client = globals.client;
  const locales = getLocales(record[globals.field_key]);
  const updatedUrls = [];
  
  if(locales){
    locales.forEach( async (locale) => {
      if(record.uri[locale]){
        // await client.items.update(record.id, {
        //   [globals.field_key]: `${record.uri[locale]}`,
        //   code: locale
        // });
        updatedUrls.push(record.uri[locale])
      }
    })
  }
  else{
    if(record.uri){
      // await client.items.update(record.id, {
      //   [globals.field_key]: `${record.uri}`,
      // });
      updatedUrls.push(record.uri)
    }
  }

  if (updateChildren && record.children && record.children.length > 0){
    record.children.forEach(child => {
      const childUrl = updateEntry(child);
      updatedUrls.contact(childUrl);
    });
  }
  
  return updatedUrls
}

const updateRecordAndChildren = async (record) => {
  const updatedUrls = [];

  // Update current Record
  // const updatedEntryArray = updateEntry(record);
  // updatedUrls.concat( updatedEntryArray );

  return updatedUrls;
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
  console.log(currentRecord);


  // TODO: 
  // - Add working update function
  // - Test changed pages array result

  // Update all records with their new slugs
  let changedPagesList_test = []
  changedPagesList_test = await updateRecordAndChildren(currentRecord);
  console.log(changedPagesList_test);



  // TODO
  // - Return a list with al changed pages
  // - Rneder the list in the frontend

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