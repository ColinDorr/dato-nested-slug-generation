// @ts-nocheck
import { buildClient } from "@datocms/cma-client-browser";

const addUrlPrefix = () => {
  const prefixParams = []
  // field.attributes.appearance.parameters.url_prefix
  return prefixParams
}

const addTreeFields = (pages, tree, slugFieldKey) => {
  // Add uri and children to pageObjects.
  pages.forEach(page => {
    tree[page.id] = { 
      ...page,
      uri: page[slugFieldKey],
      children: [],
    };
  });
  return tree;
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

const generateTree = (pages, changedfield, slugFieldKey, slug_prefix) => {
  let tree = {};
  tree = addTreeFields(pages, tree, slugFieldKey);
  tree = addTreeUriAndChildData(pages, changedfield, slugFieldKey, tree, slug_prefix);
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

export default async function updateAllChildrenSlugs(
  apiToken: string,
  modelID: string,
  field: any,
  slug_prefix: string | null
) {
  const slugFieldKey = Object.keys(field.attributes as object)[0];
  const client = buildClient({
    apiToken,
  });
  
  // Get all pages of same type
  const items = (await client.items.list({
    filter: { type: modelID, },
  }));

  // Generate page relation tree
  const tree = generateTree(items, field, slugFieldKey, slug_prefix);
  console.log(tree)

  // Update page slug that was changed and all nested children
  const changedPage = tree[field.id];
  const changedPagesList = getChangedPagesList(changedPage);
  if(changedPagesList.length){
    changedPagesList.forEach(async (page) => {
      console.log(page.uri)
      await client.items.update(page.id, {
        [slugFieldKey]: `${page.uri}`,
      });
    });
  }

  return changedPagesList;
}