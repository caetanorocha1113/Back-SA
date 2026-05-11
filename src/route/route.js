const express = require("express");
const routes = express.Router();

const users = [{ id: 1, email: "admin@teste.com", password: "123" }];

routes.post("/login", (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        return res.status(200).json({ message: "Login efetuado" });
    } else {
        return res.status(401).json({ message: "Credenciais inválidas" });
    }
});


routes.post("/cadastro", (req, res) => {
    const { email, password } = req.body;
    
    const userExists = users.find(u => u.email === email);
    if (userExists) {
        return res.status(400).json({ message: "E-mail já cadastrado!" });
    }
    
    users.push({ id: users.length + 1, email, password });
    return res.status(201).json({ message: "Cadastrado com sucesso!" });
});

module.exports = routes;