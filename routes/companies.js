const express = require("express");
const db = require("../db");
const ExpressError = require("../expressError");
const slugify = require("slugify")

let router = new express.Router();

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
    const companyResult = await db.query(`SELECT * FROM companies WHERE code=$1`, [code]);

    if (companyResult.rows.length === 0) {
      throw new ExpressError(`No such company: ${code}`, 404);
    }

    const invoicesResult = await db.query(
      `SELECT * FROM invoices WHERE comp_code=$1`,
      [code]
    );
    const company = companyResult.rows[0];
    company.invoices = invoicesResult.rows.map(invoice => invoice.id);
    return res.json({ company });
  } catch (err) {
    return next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, description } = req.body;
    // slugify the code
    const code = slugify(req.body.code, { replacement: "", lower: true, strict: true })
    const results = await db.query(
      `INSERT INTO companies (code, name, description) VALUES ($1, $2, $3) RETURNING code, name, description`,
      [code, name, description]
    );
    return res.status(201).json({ company: results.rows[0] });
  } catch (err) {
    return next(err);
  }
});

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
