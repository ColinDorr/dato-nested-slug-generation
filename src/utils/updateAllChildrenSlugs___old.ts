// @ts-nocheck
import { buildClient } from "@datocms/cma-client-browser";

const cleanCurrentUri = (currentUri) => {
  if(!currentUri) { return null }
  const uri = currentUri.split('/').filter( i => i.length > 0 );
  return uri[uri.length - 1];
}

// Set uri for each page locales
const setUriValueOfPage = (page, slug_field_data, prefix = null) =>  {
  if (typeof slug_field_data.field_locales === "object") {
    const uriObject = {};
    const locales = Object.keys(page[slug_field_data.field_key]);
    locales.forEach( local => {
      const local_uri = page[slug_field_data.field_key][local];
      uriObject[local] = local_uri ? `${prefix || slug_field_data.field_prefix}/${ cleanCurrentUri(local_uri) }` : null;
    });
    return uriObject
  }
  return `${ prefix && prefix.length > 0 ? prefix + '/' : "" }${ cleanCurrentUri(page[slug_field_data.field_key]) }`;
}

// Returns Array with locales keys (multi-language) or null (single langauge) 
// ['de', 'nl-Nl']
const getLocales = (slug_field_data, data = slug_field_data.field_updated) =>  {
  if (data?.attributes?.[slug_field_data?.field_key] && typeof data.attributes[slug_field_data?.field_key] === "object") {
    return Object.keys(data.attributes[slug_field_data?.field_key])
  }
  return null
}

// Const pass path of url and only returns last segment 
// /locaties/amsterdam/kauwgomballenkwartier?test#loc-1 => kauwgomballenkwartier
const getUriSegmentOfPage = (text) =>  {
  if(!text) { return null }
  let segment = text.split('/').filter( i => i.length > 0 );
  return segment[segment.length - 1].split('?')[0].split('#')[0];
}

const updatePageUriSegments = (pageUriSegments, locales, slug_field_data, currentPage, page =currentPage ) => {  
  const source = currentPage.id === slug_field_data.field_updated_id  ? { [slug_field_data.field_key]: slug_field_data.field_locales} : currentPage;
  if(locales){
    locales.forEach( local => {
      if (page[slug_field_data.field_key][local]){
        const pageLocaleSegement = getUriSegmentOfPage(source[slug_field_data.field_key][local]);
        pageUriSegments[local].unshift(pageLocaleSegement);
      }
    })
  } 
  else if (page[slug_field_data.field_key]) {
    const pageSegement = getUriSegmentOfPage(source[slug_field_data.field_key]);
    pageUriSegments.unshift(pageSegement)
  }
  return pageUriSegments
}

const generateUrlBasedOnSegments = (pageUriSegments, slug_field_data, locales) => {
  if(locales){
    const localesPaths = {};
    locales.forEach( local => {
      const url_prefix = slug_field_data.field_prefix;
      localesPaths[local] = pageUriSegments[local] && pageUriSegments[local].length ? `${url_prefix ? url_prefix + "/" : ""}${pageUriSegments[local].join("/")}` : "";
    });
    return localesPaths;
  } else {
    const url_prefix = slug_field_data.field_prefix;
    return pageUriSegments && pageUriSegments.length ? `${url_prefix ? url_prefix + "/" : ""}${pageUriSegments.join("/")}` : "";
  }
}

const addTreeUriAndChildData = (allPageItems, slug_field_data, tree) => {
  // console.log({allPageItems, slug_field_data, tree, locales})
  const locales = getLocales(slug_field_data)
  
  allPageItems.forEach(page => {
    let pageUriSegments = locales ? {} : [];
    if (locales) {
      locales.forEach( local => { pageUriSegments[local] = [] });
    }
    
    let currentPage = page;
    while (currentPage && currentPage.parent_id !== null) {
      // Get localised URI op parent elements and create a array with all slug partials
      pageUriSegments = updatePageUriSegments(pageUriSegments, locales, slug_field_data, currentPage, page);   

      // Add Child entries to parent page. 
      const isNewChildCheck = tree[currentPage.parent_id].children.filter(childPage => childPage.id === tree[currentPage.id].id);
      const isNewValue = isNewChildCheck.length === 0;
      if (isNewValue) {
        tree[currentPage.parent_id].children.push(tree[currentPage.id]);
      }

      // Update currentPage variable, to continue the loop.
      currentPage = tree[currentPage.parent_id];
    }

    // Add current uri and return full path as uri to tree.
    pageUriSegments = updatePageUriSegments(pageUriSegments, locales, slug_field_data, currentPage, page);   
    
    // Add new uri to tree entries
    const fullPaths = generateUrlBasedOnSegments(pageUriSegments, slug_field_data, locales);
    if (locales) {
      locales.forEach( local => {
        tree[page.id].uri[local] = fullPaths[local]
      });
    } else {
      tree[page.id].uri = fullPaths
    }
  });
  return tree;
}



const getChangedPagesList = (page) => {
  const changedPagesList = [];
  const flatten = (page) => {
    changedPagesList.push(page);
    if(page.children){
      page.children.forEach(child => {
        flatten(child);
      });
    }
  }
  flatten(page);
  return changedPagesList
}



const addTreeFields = (allPageItems, slug_field_data, tree) => {
  // Add uri and children to pageObjects.
  const prefix = slug_field_data.field_prefix;
  allPageItems.forEach(page => {
    tree[page.id] = { 
      ...page,
      uri: setUriValueOfPage(page, slug_field_data, prefix),
      children: [],
    };
  });
  return tree;
}

const generateTree = (allPageItems, slug_field_data) => {
  let tree = {};
  tree = addTreeFields(allPageItems, slug_field_data, tree);
  tree = addTreeUriAndChildData(allPageItems, slug_field_data, tree);
  return tree;
}

const updateEntry = async (client, page, slug_field_data, locales) =>  {
  if(locales){
    locales.forEach( async (local) => {
      await client.items.update(page.id, {
        [slug_field_data.field_key]: `${page.uri}`,
        code: local
      });
    })
  }
  else{
    await client.items.update(page.id, {
      [slug_field_data.field_key]: `${page.uri}`,
    });
  }
  return
}



// const getParent = (page, slug_field_data) =>  {}
// const getChildren = (page, slug_field_data) =>  {}

// const getUriSegment = (page, slug_field_data) =>  {}
// const getLocales = (page, slug_field_data) =>  {}
// const getParentPath = (page, slug_field_data) =>  {}
// const getPrefix = (page, slug_field_data) =>  {}

// const getFullPath = (page, slug_field_data) =>  {
//   const params = [
//     getPrefix(),
//     ...getParentPath(),
//     getUriSegment()
//   ]
// }
// const updateEntry = (page) =>  {}

interface SlugFieldData {
  field_locales: {} | string | null;
  field_key: string | null;
  field_prefix: string | null;
  field_updated: any | null;
  field_updated_id: string | null;
}

export default async function updateAllChildrenSlugs(
  apiToken: string, 
  modelId: string, 
  slug_field_data: SlugFieldData
) {
  const client = buildClient({ apiToken });
  
  // Get all pages of same type
  const allPageItems = (await client.items.list({
    filter: { type: modelId },
  }));

  
  // Generate page relation tree
  const tree = generateTree( allPageItems, slug_field_data);
  console.log("_________Tree_______");
  console.log(tree);
  console.log("____________________");
  
  // Update page slug that was changed and all nested children
  const changedPage = tree[slug_field_data.field_updated_id];
  let changedPagesList = [];
  changedPagesList = getChangedPagesList(changedPage);
  if(changedPagesList.length){
    changedPagesList.forEach(async (page) => {
      const locales = getLocales(slug_field_data, page);
      await updateEntry(client, page, slug_field_data, locales)
    });
  }

  return changedPagesList;
}