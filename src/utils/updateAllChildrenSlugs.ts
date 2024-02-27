// @ts-nocheck
import { buildClient } from "@datocms/cma-client-browser";

// Variabled
let globals = null;

// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Date formatting Helpers
// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
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
      fieldValue = 
        globals.field.update_id === current_parent.id 
          ? globals.field.value[locale] 
          : current_parent[globals.field.key][locale];
    } else {
      fieldValue = 
        globals.field_updated.id === current_parent.id 
          ? globals.field.value
          : current_parent[globals.field.key];
    }
    params.unshift( 
      getUriSegment(fieldValue)
    );
    current_parent = current_parent.parent;
  }

  if(globals.field.prefix){
    params.unshift(getUriSegment(globals.field.prefix));
  }
  return params
}

const generateNewUri = (record, locale) => {
  let params = [];
  if (locale && globals.field.localized && record[globals.field.key].hasOwnProperty(locale)) {
    params = loopTroughParentsSlugs(record, locale);
  } 
  else if (!globals.field.localized) {
    params = loopTroughParentsSlugs(record, locale);
  }
  return params.includes(null) ? null : params.join('/');
}

// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Date queries and generation of nested contend
// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const getParentOfRecord = async (childRecord) => {
  if(!childRecord.parent_id) { return null }

  const client = globals.settings.client;
  const parentRecord = await client.items.find(childRecord.parent_id)

  if (parentRecord) {
    globals.parents.push(parentRecord);
    const parentValue = parentRecord.parent_id ? undefined : null; 
    return await setRecordFields(parentRecord, parentValue, childRecord)
  }

  return parentRecord;
} 

const getChildrenOfRecord = async (parentRecord) => {
  const modelID = globals.settings.model_id;
  const client = globals.settings.client;
  let childRecords = [];

  if (parentRecord.hasOwnProperty("parent_id")){
    childRecords = await client.items.list({
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
  }

  return childRecords;
}

const setRecordFields = async (
  record, 
  parent = undefined, 
  children = undefined
) => {
  const locales = globals.field.locales;
  let uriValue = locales ? {} : null;

  // Create a parent attribute in record with parentRecord or null
  record.parent = 
    parent === undefined 
    ? await getParentOfRecord(record) 
    : parent;

  // Create a children attribute in record with an childrenRecord array or a empty array
  record.children = 
    children === undefined 
    ? await getChildrenOfRecord(record)
    : children;

  // Create a uri attribute in record with an localised object with uri string, for each site, or a single global string
  if (locales) {
    locales.forEach( (locale) => { uriValue[locale] = generateNewUri(record, locale); } );
  } else {
    uriValue = generateNewUri(record, null);
  }
  record.uri = uriValue;

  return record;
}

const getCurrentRecord = async (currentId:string) => {
  const client = globals.settings.client
  const record = await client.items.list({
    filter: {
      type: globals.settings.model_id,
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
      currentRecord.parent_id ? await getParentOfRecord(currentRecord) : null, // parent record result => RecordItem | null
      await getChildrenOfRecord(currentRecord)  // Child records => [RecordItem] | []
    )
  }
  return currentRecord;
}


// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// DatoCMS mutations
// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// TODO !!!
// DOCS: https://www.datocms.com/docs/content-management-api/resources/item/update
const trowCatchUpdateEntry = async ( record, options, loop = 1, maxTries = 3) => {
  const client = buildClient({ apiToken: globals.apiToken });
  record = await client.items.find(record.id);
  try {
    await client.items.update(record.id, options);
    return { message: "success", record, options }
  }
  catch (e) {
    console.log({record, options, e, })
    if(loop < maxTries){
      trowCatchUpdateEntry(record, options, loop + 1)
    }
    return { message: "failed", record, options, e };
    // throw e;
  }
}

const updateEntry = async (record) =>  {
  const locales = globals.field.locales
  let options = {}
  let allowUpdate = false;

  // Update current entry
  if(locales){
    const localisedValues = locales.reduce((acc, locale) => {
      acc[locale] = record.uri && record.uri.hasOwnProperty(locale) && record.uri[locale] ? record.uri[locale] : null;
      return acc;
    }, {});

    options = {
      [globals.field.key] : {
        ...localisedValues
      }
    }
    allowUpdate = true
  } 
  else if(record.uri){
    options = {
      [globals.field.key] : record.uri ? record.uri  : null
    }
    allowUpdate = true;
  }
  return allowUpdate ? await trowCatchUpdateEntry (record, options) : null;
}

export default async function updateAllChildrenSlugs( changed ) {
  globals = changed;

  // // Get Current record tree with nested parent and child data
  const currentRecord = await getCurrentRecord( globals.field.update_id );
  const children = globals.children;

  console.log({
    globals,
    currentRecord,
    children_test: children,
    children: globals.children,
    parents: globals.parents,
  })
  
  // TODO Issue with children list
  const updatedTree = globals.children ? [currentRecord].concat(globals.children) : [currentRecord];
  
  
  
  // globals.children && globals.children.length ? [currentRecord].concat(globals.children) : [currentRecord];

  console.log(updatedTree)

  updatedTree.forEach( async (record) => {
    // console.log(record)
    // const result = await updateEntry(record);
    // console.log(result)
  });


  // TODO: 
  // - Add working update function
  // Update all records with their new slugs
  let changedPagesList = []
  // changedPagesList = await updateRecordAndChildren(currentRecord);
  return changedPagesList;
}