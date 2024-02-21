// @ts-nocheck
import { buildClient } from "@datocms/cma-client-browser";

const addUrlPrefix = () => {
  const prefixParams = []
  // field.attributes.appearance.parameters.url_prefix
  return prefixParams
}



const getPageUri = (page, changedfield, slugFieldKey, tree) => {
  // console.log({page, changedfield, slugFieldKey, tree})
  const slugFieldValue = page.id === changedfield.id && changedfield.attributes[slugFieldKey] ? changedfield.attributes[slugFieldKey] : tree[page.id].uri;
  const uri = slugFieldValue.split('/');
  return uri[uri.length - 1]
}

const addTreeUriAndChildData = (pages, changedfield, slugFieldKey, tree) => {
  pages.forEach(page => {
    const params = [];    
    let currentPage = page;
    while (currentPage && currentPage.parent_id !== null) {      
      // Get URI op parent element.
      params.unshift( 
        getPageUri(tree[currentPage.parent_id], changedfield, slugFieldKey, tree)
      );

      // Add Children to parent page. 
      const isNewChildCheck = tree[currentPage.parent_id].children.filter(childPage => childPage.id === tree[currentPage.id].id);
      const isNewValue = isNewChildCheck.length === 0;
      if (isNewValue) {
        tree[currentPage.parent_id].children.push(tree[currentPage.id]);
      }

      // Update currentPage variable, to continue the loop.
      currentPage = tree[currentPage.parent_id];
    }

    // Add current uri and return full path as uri to tree.
    params.push(
      getPageUri(page, changedfield, slugFieldKey, tree)
    );
    tree[page.id].uri = `${params.join('/')}`;
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

// Set uri for each page locales
const setUriValueOfPage = (page, slug_field_data, prefix = null) =>  {

  const cleanCurrentUri = (currentUri) => {
    const uri = currentUri.split('/').filter( i => i.length > 0 );
    return uri[uri.length - 1];
  }

  if (typeof slug_field_data.field_locales === "object") {
    const uriObject = {};
    const locales = Object.keys(page[slug_field_data.field_key]);
    locales.forEach( local => {
      const local_uri = page[slug_field_data.field_key][local];
      uriObject[local] = local_uri ? `${prefix || slug_field_data.field_prefix}/${ cleanCurrentUri(local_uri) }` : null;
    });
    return uriObject
  }
  return `${prefix || slug_field_data.field_prefix}/${ cleanCurrentUri(page[slug_field_data.field_key]) }`;
}

const addTreeFields = (allPageItems, slug_field_data, tree) => {
  // Add uri and children to pageObjects.
  allPageItems.forEach(page => {
    tree[page.id] = { 
      ...page,
      uri: setUriValueOfPage(page, slug_field_data),
      children: [],
    };
  });
  return tree;
}

const generateTree = (allPageItems, slug_field_data) => {
  let tree = {};
  tree = addTreeFields(allPageItems, slug_field_data, tree);
  // tree = addTreeUriAndChildData(allPageItems, slug_field_data);
  return tree;
}

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
  // const slugFieldKey = Object.keys(field.attributes as object)[0];
  const client = buildClient({ apiToken });

  // Get all pages of same type
  const allPageItems = (await client.items.list({
    filter: { type: modelId },
  }));

  // console.log(slug_field_data)

  // Generate page relation tree
  const tree = generateTree(
    allPageItems, 
    slug_field_data
  );
  console.log(tree)

  // Update page slug that was changed and all nested children
  // const changedPage = tree[field.id];
  let changedPagesList = []
  // changedPagesList = getChangedPagesList(changedPage);
  // if(changedPagesList.length){
  //   changedPagesList.forEach(async (page) => {
  //     await client.items.update(page.id, {
  //       [slugFieldKey]: `${page.uri}`,
  //     });
  //   });
  // }

  return changedPagesList;
}