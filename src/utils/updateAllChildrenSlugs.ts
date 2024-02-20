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

const addTreeUriAndChildData = (pages, tree) => {
  pages.forEach(page => {
    const params = [];
    
    let currentPage = page;
    while (currentPage && currentPage.parent_id !== null) {      
      // Get URI op parent element.
      const uri = tree[currentPage.parent_id].uri.split('/');
      params.unshift(uri[uri.length - 1]);
      
      // Add Children to parent page. 
      // TODO: CHECK WERKT NOG NIET CORRECT.
      // DUBBELE CHILD ENTRIES WORDEN NOG GETOOND, BIJVOORBEEL "club-sessions"
      const isNewChild = tree[currentPage.parent_id].children.filter(child => child.id !== currentPage.id);
      if(isNewChild.length === 0){
        tree[currentPage.parent_id].children.push(tree[currentPage.id]);
      }

      // Update currentPage variable, to continue the loop.
      currentPage = tree[currentPage.parent_id];
    }

    // Add current uri and return full path as uri to tree.
    const uri = tree[page.id].uri.split('/')
    params.push(uri[uri.length - 1]);
    tree[page.id].uri = `${params.join('/')}`;
  });

  console.log(`Generate tree - Run ${run}`);
  console.log(tree)
  console.log("---------------------------");
  return tree;
}

const generateTree = (pages, slugFieldKey) => {
  let tree = {};
  tree = addTreeFields(pages, tree, slugFieldKey);
  tree = addTreeUriAndChildData(pages, tree);
  return tree;
}

export default async function updateAllChildrenSlugs(
  apiToken: string,
  modelID: string,
  field: any,
) {
  const slugFieldKey = Object.keys(field.attributes as object)[0];
  const client = buildClient({
    apiToken,
  });

  const items = (await client.items.list({
    filter: { type: modelID, },
  }));

  const tree = generateTree(items, slugFieldKey);
  const changedPage = tree[field.id];
  console.log(changedPage);

  const changeList = [];
  // const changedFields = Object.values(tree).filter( (page) => {return page.uri !== page[slugFieldKey]});
  // if (changedFields.length) {
  //   changedFields.forEach(async (page) => {
  //     changeList.push(page);
  //     await client.items.update(page.id, {
  //       [slugFieldKey]: page.uri,
  //     });
  //   });
    
  //   // Log all changes to console
  //   console.log(changeList);
    
  //   // Run second time 
  //   // updateAllChildrenSlugs(apiToken, modelID, slugFieldKey);
  // };

  return changeList;
}