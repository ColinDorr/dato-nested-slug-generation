import { buildClient } from "@datocms/cma-client-browser";

interface PageItem {
  id: string,
  slug: string,
  api_slug_field: string,
  parent_id: string | null,
  children?: [PageItem] | [] | null
}

// Array with tree-like structure of nested pages

// @ts-ignore

export default async function updateAllChildrenSlugs(
  apiToken: string,
  modelID: string,
  parentID: string,
  slugFieldKey: string,
  updatedSlug: string
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
  }));

  console.log(items)

  // const hierarchy = generateHierarchy(items);
  // console.log({hierarchyObject})

  // const records = await client.items.list({
  //   filter: {
  //     type: modelID,
  //     fields: {
  //       parent: {
  //         eq: parentID,
  //       },
  //     },
  //   },
  // });

  // console.log({
  //   apiToken,
  //   modelID,
  //   parentID,
  //   slugFieldKey,
  //   updatedSlug,
  //   client,
  //   records
  // })


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