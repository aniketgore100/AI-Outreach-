
function renderTemplate(template, lead) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_match, key) => {
    const value = lead[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

module.exports = { renderTemplate };
