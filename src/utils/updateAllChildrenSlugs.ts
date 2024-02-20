// @ts-nocheck
import { buildClient } from "@datocms/cma-client-browser";

interface PageItem {
  id: string,
  slug: string,
  api_slug_field: string,
  parent_id: string | null,
  children?: [PageItem] | [] | null
}


// const updatePageUris = (tree, pages) => {
//   pages.forEach(page => {
//     while (page.parent_Id) {
//       tree[page.id].parents.push(tree[page.parent_Id]);
//       // tree[page.parent_Id].children.push(tree[page.id]);
//     }
//   });

//   return tree;
// }


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
      const uri = tree[currentPage.parent_id].uri.split('/')
      params.unshift(uri[uri.length - 1]);
      
      // Add Children to parent page.
      const isNewChild = tree[currentPage.parent_id].children.filter(child => child.id !== currentPage.id);
      if(isNewChild.length === 0){
        tree[currentPage.parent_id].children.push(tree[currentPage.id]);
      }

      // Update currentPage variable, to continue the loop.
      currentPage = tree[currentPage.parent_id];
    }

    // Add current uri and return full path as uri to tree.
    params.push(tree[page.id].uri);
    tree[page.id].uri = `/${params.join('/')}`;
  });
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
  slugFieldKey: string,
) {
  const client = buildClient({
    apiToken,
  });
  
  // locale: locale,
  const items = (await client.items.list({
    filter: {
      type: modelID,
      order_by: "_rank_DESC",
    },
    nested: true
  }));

  const tree = generateTree(items, slugFieldKey);
  console.log("-----------Tree-structure-----------");
  console.log(tree);
  console.log("------------------------------------");

//   if (records.length) {
//     records.forEach(async (record) => {
//       const destructuredOldSlug = (record[slugFieldKey] as string).split("/");
//       await client.items.update(record.id, {
//         [slugFieldKey]:
//           updatedSlug +
//           "/" +
//           destructuredOldSlug[destructuredOldSlug.length - 1],
//       });

//       updateAllChildrenSlugs(
//         apiToken,
//         modelID,
//         record.id,
//         slugFieldKey,
//         updatedSlug + "/" + destructuredOldSlug[destructuredOldSlug.length - 1]
//       );
//     });
//   }
}