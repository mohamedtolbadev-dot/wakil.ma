// Helper functions for rendering message templates with variable substitution

/**
 * Renders a template string by replacing variables with values
 * Variables format: {{variableName}}
 *
 * @param {string} template - The template string with {{variables}}
 * @param {Object} vars - Object containing variable values
 * @returns {string} - Rendered string with variables replaced
 *
 * @example
 * renderTemplate("Hello {{name}}! Your order #{{orderId}} is confirmed", { name: "Ali", orderId: "12345" })
 * // Returns: "Hello Ali! Your order #12345 is confirmed"
 */
export function renderTemplate(template, vars) {
  if (!template || typeof template !== "string") {
    return null
  }

  let result = template

  for (const [key, value] of Object.entries(vars)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, "g")
    result = result.replace(placeholder, value ?? "")
  }

  return result
}
