import * as clientService from "../services/client.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getAllClients = async (req, res) => {
  const result = await clientService.getAllClients(
    req.companyId,
    req.validated?.query,
    req.user.id,
  );
  ApiResponse.ok(res, "Clients retrieved successfully", result);
};

export const getClientById = async (req, res) => {
  const { client } = await clientService.getClientById(
    req.companyId,
    req.validated.params.id,
    req.user.id,
  );
  ApiResponse.ok(res, "Client retrieved successfully", client);
};

export const createClient = async (req, res) => {
  const client = await clientService.createClient(
    req.companyId,
    req.validated.body,
    req.user.id,
  );
  ApiResponse.created(res, "Client created successfully", client);
};

export const updateClient = async (req, res) => {
  const client = await clientService.updateClient(
    req.companyId,
    req.validated.params.id,
    req.validated.body,
    req.user.id,
  );
  ApiResponse.ok(res, "Client updated successfully", client);
};

export const deleteClient = async (req, res) => {
  await clientService.deleteClient(
    req.companyId,
    req.validated.params.id,
    req.user.id,
  );
  ApiResponse.noContent(res);
};
