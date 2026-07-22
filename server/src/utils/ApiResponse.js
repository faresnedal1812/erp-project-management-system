/**
 * Standardized API Response builder.
 *
 * WHY: Every successful response in the API must follow the same shape:
 *   { success: true, message: "...", data: {...} }
 *
 * This makes client-side parsing predictable. The frontend always knows
 * where to find the payload (res.data.data) and the status (res.data.success).
 */
class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Human-readable success message
   * @param {*} [data=null] - Response payload
   */
  constructor(statusCode, message, data = null) {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
  }

  /**
   * Sends the response via Express res object.
   * @param {import('express').Response} res
   */
  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      message: this.message,
      data: this.data,
    });
  }

  // --- Factory methods for common success responses ---

  static ok(res, message = "Success", data = null) {
    return res.status(200).json({ success: true, message, data });
  }

  static created(res, message = "Created successfully", data = null) {
    return res.status(201).json({ success: true, message, data });
  }

  static noContent(res) {
    return res.status(204).send();
  }
}

export default ApiResponse;
