const columns = {
  adhesion: {
    city_code: 27,
    uf_code: 29,
    customer: 1,
    uf: 30,
    payment: 62,
    ocs_activation: 40,
    description: 41,
    adress_number: 24
  },
  purchase: {
    customer: 1,
    payment: 28,
    ocs_activation: 12,
    description: 13
  },
  registerChange: {
    customer: 2,
    uf: 19,
    city_code: 16,
    uf_code: 18,
    adress_number: 13
  }
}

const kind = {
  adhesion: 'adhesion',
  purchase: 'purchase',
  registerChange: 'registerChange'
}

const regex = {
  adhesion: /ADESAO_PRIMEIRA_COMPRA/g,
  purchase: /COMPRA_SERVICO/g,
  registerChange: /ALTERACAO_CADASTRAL/g
}

module.exports = { columns, regex, kind }
