
// export async function callAction(v: number) {
//   'use server';
//   console.log('Button pressed !', v);
//   return `... ${v}`;

// }

export const secall = async (v: number) => {
  'use server';
  // This code runs on the server.
  console.log('Button pressed !', v);
  return `... ${v}`;
}
