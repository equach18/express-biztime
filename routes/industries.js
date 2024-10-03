const express = require("express");
const db = require("../db");
const ExpressError = require("../expressError");
const slugify = require("slugify");

let router = new express.Router();

// GET / lists all industries. Return obj: {industries: {code, industries, companies:[industry_code,...]}}
router.get("/", async (req, res, next) => {
  try {
    const results = await db.query(`SELECT i.code, i.industry, ARRAY_AGG(ci.comp_code) AS companies 
    FROM industries AS i
    LEFT JOIN company_industries AS ci ON i.code = ci.industry_code
    GROUP BY i.code, i.industry`);
    return res.json({ industries: results.rows });
  } catch (err) {
    return next(err);
  }
});

// POST / adds an industry.
router.post("/", async (req, res, next) => {
  try {
    const industry = req.body.industry;
    // slugify the code
    const code = slugify(req.body.code, {
      replacement: "",
      lower: true,
      strict: true,
    });
    const results = await db.query(
      `INSERT INTO industries (code, industry) VALUES ($1, $2) RETURNING *`,
      [code, industry]
    );
    return res.status(201).json({ industry: results.rows[0] });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;