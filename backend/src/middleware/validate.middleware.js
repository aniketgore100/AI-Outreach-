const { z } = require("zod");

const { ApiError } = require("../utils/api-error");


function validate(schema, source = "body") {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      next(ApiError.badRequest("Validation failed", z.treeifyError(result.error)));
      return;
    }

    req[source] = result.data;
    next();
  };
}

module.exports = { validate };
