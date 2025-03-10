// Importing the assert module
const assert = require('assert');
// Importing the 'login' function
const { login } = require("../index.js");

describe("login", () => {
   // Test case 1 check invalid username
  it("should return an error if username is invalid", async () => {
    const username = "invalidUsername";
    const password = "password123";
    const expectedResponse = { status: "error", message: "Invalid username" };
    
    const response = await login(username, password);
    assert.deepStrictEqual(response, expectedResponse);
  });
   // Test case 2 check invalid password
  it("should return an error if password is invalid", async () => {
    const username = "validUsername";
    const password = "invalidPassword";
    const expectedResponse = { status: "error", message: "Invalid password" };
    
    const response = await login(username, password);
    assert.deepStrictEqual(response, expectedResponse);
  });
  // Test case 3 check  all valid credentials
  it("should return a success response if credentials are valid", async () => {
    const username = "validUsername";
    const password = "validPassword";
    const expectedResponse = { status: "success" };
    
    const response = await login(username, password);
    assert.deepStrictEqual(response, expectedResponse);
  });
});

