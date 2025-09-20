export function GET(request: Request) {
  console.log("trrigeredd")
  return Response.json({ hello: 'world' });
}
