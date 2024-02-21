// @ts-nocheck
import { buildClient } from "@datocms/cma-client-browser";

interface PageItem {
  id: string,
  slug: string,
  api_slug_field: string,
  parent_id: string | null,
  children?: [PageItem] | [] | null
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

  console.log({
    slugFieldKey,
    check: page.id === changedfield.id,
    changedfield: changedfield.attributes[slugFieldKey],
    page,
    treePage:  tree[page.id]
  })

  const slugFieldValue = page.id === changedfield.id && changedfield.attributes[slugFieldKey] ? changedfield.attributes[slugFieldKey] : tree[page.id].uri;
  const uri = slugFieldValue.split('/');
  console.log({
    page, changedfield, tree,
    isChanged: page.id === changedfield.id,
    pageId: page.id,
    changedfieldId: changedfield.id,
    uri: uri,
    slugFieldValue,
    result: uri[uri.length - 1]
  })
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
    console.log("uri 2");
    params.push(
      getPageUri(page.id, changedfield, slugFieldKey, tree)
    );
    // tree[page.id].uri = `${params.join('/')}`;
  });

  console.log(`Generate tree:____________`);
  console.log(tree)
  console.log("__________________________");
  return tree;
}

const generateTree = (pages, changedfield, slugFieldKey) => {
  let tree = {};
  tree = addTreeFields(pages, tree, slugFieldKey);
  tree = addTreeUriAndChildData(pages, changedfield, slugFieldKey, tree);
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
) {
  const slugFieldKey = Object.keys(field.attributes as object)[0];
  console.log({
    new_slug:  field.attributes[slugFieldKey]
  })
  const client = buildClient({
    apiToken,
  });
  
  // Get all pages of same type
  const items = (await client.items.list({
    filter: { type: modelID, },
  }));

  // Generate page relation tree
  const tree = generateTree(items, field, slugFieldKey);

  // Update page slug that was changed and all nested children
  // const changedPage = tree[field.id];
  // const changedPagesList = getChangedPagesList(changedPage);
  // console.log({changedPage, changedPagesList});

  // if(changedPagesList.length){
  //   changedPagesList.forEach(async (page) => {
  //     await client.items.update(page.id, {
  //       [slugFieldKey]: page.uri,
  //     });
  //   });
  // }

  return changedPagesList;
}