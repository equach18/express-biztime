const express = require("express");
const db = require("../db");
const ExpressError = require("../expressError");
const slugify = require("slugify");

let router = new express.Router();

// GET /companies : Returns list of companies, like {companies: [{code, name}, ...]}
router.get("/", async (req, res, next) => {
  try {
    const results = await db.query(`SELECT code, name FROM companies`);
    return res.json({ companies: results.rows });
  } catch (err) {
    return next(err);
  }
});

// GET /companies/[code] : Return obj of company: {company: {code, name, description, invoices: [id, ...]}} If the company given cannot be found, this should return a 404 status response.
router.get("/:code", async (req, res, next) => {
  try {
    const { code } = req.params;
    const companyResult = await db.query(
      `SELECT * FROM companies WHERE code=$1`,
      [code]
    );

    if (companyResult.rows.length === 0) {
      throw new ExpressError(`No such company: ${code}`, 404);
    }

    const invoicesResult = await db.query(
      `SELECT * FROM invoices WHERE comp_code=$1`,
      [code]
    );

    const industriesResult = await db.query(
      `SELECT i.industry 
      FROM company_industries AS ci
      JOIN industries AS i ON ci.industry_code = i.code
      WHERE ci.comp_code = $1`,
      [code]
    );
    const company = companyResult.rows[0];
    company.invoices = invoicesResult.rows.map((invoice) => invoice.id);
    company.industries = industriesResult.rows.map(ind => ind.industry);
    return res.json({ company });
  } catch (err) {
    return next(err);
  }
});

// POST /companies : Adds a company. Needs to be given JSON like: {code, name, description} Returns obj of new company:  {company: {code, name, description}}
router.post("/", async (req, res, next) => {
  try {
    const { name, description } = req.body;
    // slugify the code
    const code = slugify(req.body.code, {
      replacement: "",
      lower: true,
      strict: true,
    });
    const results = await db.query(
      `INSERT INTO companies (code, name, description) VALUES ($1, $2, $3) RETURNING code, name, description`,
      [code, name, description]
    );
    return res.status(201).json({ company: results.rows[0] });
  } catch (err) {
    return next(err);
  }
});

// POST /[code]/industries associates an industry to a company
router.post("/:code/industries", async (req, res, next) => {
  try {
    const {code} = req.params;
    const {industry_code} = req.body;
    const results = await db.query(
      `INSERT INTO company_industries (comp_code, industry_code) VALUES ($1, $2) RETURNING *`,
      [code, industry_code]
    );
    return res.status(201).json({ company_industry: results.rows[0] });
  } catch (err) {
    return next(err);
  }
});

// PUT /companies/[code] : Edit existing company. Should return 404 if company cannot be found.
// Needs to be given JSON like: {name, description} Returns update company object: {company: {code, name, description}}
router.put("/:code", async (req, res, next) => {
  try {
    const { code } = req.params;
    const { name, description } = req.body;
    const results = await db.query(
      `UPDATE companies SET name=$1, description=$2
    WHERE code=$3 RETURNING code, name, description`,
      [name, description, code]
    );
    if (results.rowCount === 0) {
      throw new ExpressError(`No such company: ${code}`, 404);
    }
    return res.json({ company: results.rows[0] });
  } catch (err) {
    return next(err);
  }
});

// DELETE /companies/[code] : Deletes company. Should return 404 if company cannot be found.
// Returns {status: "deleted"}
router.delete("/:code", async (req, res, next) => {
  try {
    const { code } = req.params;
    const result = await db.query(`DELETE FROM companies WHERE code=$1`, [
      code,
    ]);
    if (result.rowCount === 0) {
      throw new ExpressError(`No such company: ${code}`, 404);
    }
    return res.json({ status: "Deleted" });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
