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

// **GET /invoices :** Return info on invoices: like `{invoices: [{id, comp_code}, ...]}`
describe("GET /invoices", () => {
  test("Gets a list of 1 invoice", async () => {
    const response = await request(app).get("/invoices");
    expect(response.statusCode).toEqual(200);
    expect(response.body).toEqual({
      invoices: [{ id: testInvoice.id, comp_code: testInvoice.comp_code }],
    });
  });
});

// **GET /invoices/[id] :** Returns obj on given invoice.
// If invoice cannot be found, returns 404. Returns `{invoice: {id, amt, paid, add_date, paid_date, company: {code, name, description}}}`
describe("GET /invoices/:id", () => {
  test("Gets a single invoice", async () => {
    const response = await request(app).get(`/invoices/${testInvoice.id}`);
    expect(response.statusCode).toEqual(200);
    expect(response.body).toEqual({
      invoice: {
        id: testInvoice.id,
        amt: testInvoice.amt,
        paid: testInvoice.paid,
        add_date: testInvoice.add_date.toISOString(),
        paid_date: testInvoice.paid_date,
        company: {
          code: testCompany.code,
          name: testCompany.name,
          description: testCompany.description,
        },
      },
    });
  });
  test("Responds with 404 if invoice id cannot be found", async () => {
    const response = await request(app).get(`/invoices/675765`);
    expect(response.statusCode).toEqual(404);
  });
});

// **POST /invoices :** Adds an invoice. Needs to be passed in JSON body of: `{comp_code, amt}`
// Returns: `{invoice: {id, comp_code, amt, paid, add_date, paid_date}}`
describe("POST /invoices", () => {
  test("Creates a new invoice", async () => {
    const response = await request(app).post(`/invoices/`).send({
      comp_code: "test",
      amt: 8678,
    });
    expect(response.statusCode).toEqual(201);
    expect(response.body).toEqual({
      invoice: {
        id: expect.any(Number),
        comp_code: "test",
        amt: 8678,
        paid: false,
        add_date: expect.any(String),
        paid_date: null,
      },
    });
  });
});

// **PUT /invoices/[id] :** Updates an invoice. If invoice cannot be found, returns a 404.
// Needs to be passed in a JSON body of `{amt}` Returns: `{invoice: {id, comp_code, amt, paid, add_date, paid_date}}`
describe("PUT /invoices/:id", () => {
  test("Updates an invoice", async () => {
    const response = await request(app)
      .put(`/invoices/${testInvoice.id}`)
      .send({
        amt: 10,
      });
    expect(response.statusCode).toEqual(200);
    expect(response.body).toEqual({
        invoice: {
          id: testInvoice.id,
          comp_code: testInvoice.comp_code,
          amt: 10,
          paid: false,
          add_date: expect.any(String), 
          paid_date: null,
        },
      });
  });

  test("Responds with 404 if invoice cannot be found", async () => {
    const response = await request(app).put(`/invoices/6765`).send({
      amt: 20,
    });
    expect(response.statusCode).toEqual(404);
  });
});

// **DELETE /invoices/[id] :** Deletes an invoice.If invoice cannot be found, returns a 404. Returns: `{status: "deleted"}` 

describe("DELETE /invoices/:id", () => {
  test("Deletes a single invoice", async () => {
    const response = await request(app).delete(
      `/invoices/${testInvoice.id}`
    );
    expect(response.statusCode).toEqual(200);
    expect(response.body).toEqual({ status: "Deleted" });
  });

  test("Responds with 404 if invoice cannot be found to be deleted", async () => {
    const response = await request(app).delete(`/invoices/6765`)
    expect(response.statusCode).toEqual(404);
  });
});
