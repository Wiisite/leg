export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

const EXTERNAL_LOGIN_URL = "https://cadastro.ligaescolarguarulhense.com.br/login/";
const EXTERNAL_REGISTER_URL = "https://cadastro.ligaescolarguarulhense.com.br/registro/";

export const getLoginUrl = () => {
  return EXTERNAL_LOGIN_URL;
};

export const getRegisterUrl = () => {
  return EXTERNAL_REGISTER_URL;
};
