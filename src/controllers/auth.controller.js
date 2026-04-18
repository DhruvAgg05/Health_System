const { signupUser, loginUser } = require("../services/auth.service");

const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const result = await signupUser({ name, email, password });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await loginUser({ email, password });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,
  login,
};
