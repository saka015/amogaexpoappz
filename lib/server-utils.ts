function decodeJwt(token: string) {
    const payload = token.split('.')[1];
    const json = atob(payload); // or Buffer.from(payload, 'base64').toString() in Node
    return JSON.parse(json);
}

export function getServerAuth(req: Request) {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    let userInfo = null;
    if (token) {
        userInfo = decodeJwt(token);
    }
    return userInfo
}