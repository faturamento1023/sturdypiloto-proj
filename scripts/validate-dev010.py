"""Verifica exemplos e limites do contrato DEV-010 sem acessar uma API."""
import re
from pathlib import Path

import yaml
from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

spec_path = Path(__file__).resolve().parents[1] / "openapi" / "dev010.yaml"
spec = yaml.safe_load(spec_path.read_text(encoding="utf-8"))
root_uri = "urn:clinica-dm:openapi:dev010"
document = {"$schema": "https://json-schema.org/draft/2020-12/schema", **spec}
registry = Registry().with_resource(root_uri, Resource.from_contents(document))
formats = FormatChecker()


def resolve(value):
    """Expande uma referência OpenAPI local do objeto, quando houver."""
    while "$ref" in value:
        current = spec
        for segment in value["$ref"].removeprefix("#/").split("/"):
            current = current[segment.replace("~1", "/").replace("~0", "~")]
        value = current
    return value


def validator(reference):
    return Draft202012Validator({"$ref": root_uri + reference},
                                registry=registry, format_checker=formats)


def check_example(content):
    validator(content["schema"]["$ref"]).validate(content["example"])


operations = {}
tested_examples = set()
for path, path_item in spec["paths"].items():
    assert path.startswith("/unidades/{unidadeId}/"), path
    template = set(re.findall(r"\{([^}]+)\}", path))
    for method in ("get", "post", "patch"):
        if method not in path_item:
            continue
        op = path_item[method]
        name = op["operationId"]
        assert name not in operations, name
        operations[name] = op
        params = [resolve(p) for p in [*path_item["parameters"], *op.get("parameters", [])]]
        assert {p["name"] for p in params if p["in"] == "path" and p["required"]} == template
        param_names = {p["name"] for p in params if p["required"]}
        assert op["x-perfis"] and "401" in op["responses"] and "403" in op["responses"]
        if method == "post":
            assert "Idempotency-Key" in param_names
        if name in {"alterarAgendamento", "salvarRascunho"}:
            assert "If-Match" in param_names and {"412", "428"} <= op["responses"].keys()
        if "requestBody" in op:
            assert op["requestBody"]["required"]
            check_example(op["requestBody"]["content"]["application/json"])
            tested_examples.add((name, "body"))
        for status, raw_response in op["responses"].items():
            response = resolve(raw_response)
            assert "X-Correlation-Id" in response["headers"]
            if "Location" in response["headers"]:
                assert status == "201"
            if "ETag" in response["headers"]:
                assert status.startswith("2")
            if status == "429":
                assert "Retry-After" in response["headers"]
            for mime, content in response["content"].items():
                if status.startswith(("4", "5")):
                    assert mime == "application/problem+json" and content["example"]["status"] == int(status)
                    key = ("problem", status)
                else:
                    assert mime == "application/json"
                    key = (name, status)
                if key not in tested_examples:
                    check_example(content)
                    tested_examples.add(key)

assert len(operations) == 25
assert operations["consultarMeuAcesso"]["security"] == [{"SessaoCookie": []}]
assert spec["security"] == [{"SessaoBearer": []}]
assert operations["listarItensClinicos"]["x-perfis"] == ["medico"]
assert operations["listarItensClinicos"]["x-requer-habilitacao"]
assert operations["consultarDocumento"]["x-perfis"] == ["medico"]
assert operations["consultarSaldo"]["x-perfis"] == ["financeiro", "gestao", "administrador"]
assert operations["registrarRecebimento"]["x-requer-habilitacao"]
assert operations["registrarEstorno"]["x-requer-habilitacao"]

id_ = "00000000-0000-4000-8000-000000000001"
momento = "2026-11-05T08:00:00-03:00"
booking = {"pacienteId": id_, "profissionalId": id_, "inicio": momento, "fim": momento}
item = {"procedimentoId": id_, "convenioId": id_, "quantidade": 1}
texto = {"texto": "Exemplo sintético"}
invalid = [
    ("AbrirAtendimento", {"pacienteId": id_, "profissionalId": id_, "unidadeId": id_}),
    ("AbrirAtendimento", {"pacienteId": "não-é-id", "profissionalId": id_}),
    ("CriarAgendamento", {**booking, "inicio": "2026-11-05T08:00:00"}),
    ("AlterarAgendamento", {"acao": "cancelar", "inicio": momento, "fim": momento}),
    ("AdicionarItem", {**item, "valorUnitarioCentavos": 1}),
    ("AdicionarItem", {**item, "quantidade": 1.5}),
    ("ItemClinico", {"id": id_, "atendimentoId": id_, "procedimentoId": id_,
                     "quantidade": 1, "cobradoCentavos": 1000}),
    ("CriarDocumento", {"tipo": "laudo", "conteudo": texto}),
    ("CriarDocumento", {"tipo": "evolucao_texto", "itemId": id_, "conteudo": texto}),
    ("CriarVersaoRascunho", {"estado": "liberado", "conteudo": texto}),
    ("CriarVersaoRascunho", {"conteudo": {"texto": "x" * 24001}}),
    ("Receber", {"valorCentavos": -1}),
    ("Estornar", {"movimentoOrigemId": id_, "valorCentavos": 1}),
    ("Limite", 101),
    ("ETagForte", 'W/"rascunho-1"'),
]
for name, value in invalid:
    assert not validator(f"#/components/schemas/{name}").is_valid(value), name

print(f"DEV-010: {len(operations)} operações, {len(tested_examples)} exemplos válidos e "
      f"{len(invalid)} casos de entrada indevida rejeitados.")
