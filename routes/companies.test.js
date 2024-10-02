// connect to right DB --- set before loading db.js
process.env.NODE_ENV = "test";

// npm packages
const request = require("supertest");

// app imports
const app = require("../app");
const db = require("../db");

let testCompany;
let testInvoice;

beforeEach(async () => {
  let companyResult = await db.query(
    `INSERT INTO companies (code, name, description) 
       VALUES ('test', 'Test Company', 'this is a test') 
       RETURNING code, name, description`
  );
  //   add invoice with test company code
  let invoiceResults =
    await db.query(`INSERT INTO invoices (comp_Code, amt, paid, paid_date)
  VALUES ('test', 100, false, null) RETURNING *`);

  testCompany = companyResult.rows[0];
  testInvoice = invoiceResults.rows[0];
});

afterEach(async () => {
  // delete any data created by the test
  await db.query("DELETE from companies");
  await db.query("DELETE from invoices");
});

afterAll(async () => {
  // close db connection
  await db.end();
});

// GET /companies - Returns list of companies, like {companies: [{code, name}, ...]}
describe("GET /companies", () => {
  test("Gets a list of 1 company", async () => {
    const response = await request(app).get("/companies");
    expect(response.statusCode).toEqual(200);
    expect(response.body).toEqual({
      companies: [{ code: testCompany.code, name: testCompany.name }],
    });
  });
});

// GET /companies/:code - Return obj of company: {company: {code, name, description, invoices: [id, ...]}}
describe("GET /companies/:code", () => {
  test("Gets a single company", async () => {
    const response = await request(app).get(`/companies/${testCompany.code}`);
    expect(response.statusCode).toEqual(200);
    expect(response.body).toEqual({
      company: {
        code: testCompany.code,
        name: testCompany.name,
        description: testCompany.description,
        invoices: [testInvoice.id],
      },
    });
  });

  test("Responds with 404 if company cannot be found", async () => {
    const response = await request(app).get(`/companies/fakeCompany`);
    expect(response.statusCode).toEqual(404);
  });
});

// POST /companies - Returns obj of new company:  {company: {code, name, description}}
describe("POST /companies", () => {
  test("Creates a new company", async () => {
    const response = await request(app).post(`/companies`).send({
      code: "test2",
      name: "Test2 company",
      description: "another test",
    });
    expect(response.statusCode).toEqual(201);
    expect(response.body).toEqual({
      company: {
        code: "test2",
        name: "Test2 company",
        description: "another test",
      },
    });
  });
});

// PUT /comapnies - Returns update company object: {company: {code, name, description}}
describe("PUT /companies/:code", () => {
  test("Updates a company", async () => {
    const response = await request(app)
      .put(`/companies/${testCompany.code}`)
      .send({
        name: "Test company 2.0",
        description: "updated test",
      });
    expect(response.statusCode).toEqual(200);
    expect(response.body).toEqual({
      company: {
        code: testCompany.code,
        name: "Test company 2.0",
        description: "updated test",
      },
    });
  });

  test("Responds with 404 if company cannot be found", async () => {
    const response = await request(app)
      .put(`/companies/fakeCompany`)
      .send({
        name: "Test company 2.0",
        description: "updated test",
      });
    expect(response.statusCode).toEqual(404);
  });
});

//   DELETE /companies/[code] : Deletes company. Should return 404 if company cannot be found. Returns {status: "deleted"}
describe("DELETE /companies/:code", () => {
    test("Deletes a single company", async () => {
        const response = await request(app).delete(`/companies/${testCompany.code}`)
        expect(response.statusCode).toEqual(200);
        expect(response.body).toEqual({status: "Deleted"})
    })

    test("Responds with 404 if company cannot be found to be deleted", async () => {
      const response = await request(app).delete(`/companies/fakeComp`)
      expect(response.statusCode).toEqual(404);
    });
})

