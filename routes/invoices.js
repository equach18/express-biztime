const express = require("express");
const db = require("../db");
const ExpressError = require("../expressError");

let router = new express.Router();

// **GET /invoices :** Return info on invoices: like `{invoices: [{id, comp_code}, ...]}`
router.get("/", async (req, res, next) => {
  try {
    const results = await db.query(`SELECT id, comp_code FROM invoices`);
    return res.json({ invoices: results.rows });
  } catch (err) {
    return next(err);
  }
});

// **GET /invoices/[id] :** Returns obj on given invoice.
// If invoice cannot be found, returns 404. Returns `{invoice: {id, amt, paid, add_date, paid_date, company: {code, name, description}}}`
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const results = await db.query(
      `SELECT i.id, i.comp_code, i.amt, i.paid, i.add_date, i.paid_date, c.name, c.description FROM invoices AS i INNER JOIN companies AS c ON (i.comp_code = c.code) WHERE id = $1`,
      [id]
    );
    if (results.rows.length === 0) {
      throw new ExpressError(`No such company: ${code}`, 404);
    }
    const data = results.rows[0];
    const invoice = {
      id: data.id,
      amt: data.amt,
      paid: data.paid,
      add_date: data.add_date,
      paid_date: data.paid_date,
      company: {
        code: data.comp_code,
        name: data.name,
        description: data.description,
      },
    };
    return res.json({ invoice });
  } catch (err) {
    return next(err);
  }
});

// **POST /invoices :** Adds an invoice. Needs to be passed in JSON body of: `{comp_code, amt}`
// Returns: `{invoice: {id, comp_code, amt, paid, add_date, paid_date}}`
router.post("/", async (req, res, next) => {
  try {
    const { comp_code, amt } = req.body;
    const results = await db.query(
      `INSERT INTO invoices (comp_code, amt) VALUES ($1, $2) RETURNING id, comp_code, amt, paid, add_date, paid_date`,
      [comp_code, amt]
    );
    return res.json({ invoice: results.rows[0] });
  } catch (err) {
    return next(err);
  }
});

// **PUT /invoices/[id] :** Updates an invoice. If invoice cannot be found, returns a 404.
// Needs to be passed in a JSON body of `{amt}` Returns: `{invoice: {id, comp_code, amt, paid, add_date, paid_date}}`
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amt } = req.body;
    const results = await db.query(
      `UPDATE invoices SET amt=$1 WHERE id=$2 RETURNING id, comp_code, amt, add_date, paid_date`,
      [amt, id]
    );
    if (results.rowCount === 0) {
      throw new ExpressError(`No such company: ${code}`, 404);
    }
    return res.json({ invoice: results.rows[0] });
  } catch (err) {
    return next(err);
  }
});

// **DELETE /invoices/[id] :** Deletes an invoice.If invoice cannot be found, returns a 404. Returns: `{status: "deleted"}` Also, one route from the previous part should be updated:
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const results = await db.query(`DELETE FROM invoices WHERE id=$1`, [id]);
    if (results.rowCount === 0) {
      throw new ExpressError(`No such company: ${id}`, 404);
    }
    return res.json({ status: "Deleted" });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
