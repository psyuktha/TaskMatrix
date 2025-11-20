import os
import json
import uuid
import decimal
import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.environ.get("TODOS_TABLE")
if not TABLE_NAME:
    # Allow import-time usage in unit tests by deferring missing env var errors until runtime
    TABLE = None
else:
    TABLE = dynamodb.Table(TABLE_NAME)


def _decimal_default(o):
    if isinstance(o, decimal.Decimal):
        if o % 1 == 0:
            return int(o)
        return float(o)
    raise TypeError


def _resp(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body, default=_decimal_default),
    }


def create_todo(event, context):
    if TABLE is None:
        return _resp(500, {"message": "Server misconfigured: TODOS_TABLE not set"})
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _resp(400, {"message": "Invalid JSON body"})

    title = body.get("title")
    if not title:
        return _resp(400, {"message": "Missing required field: title"})

    item = {
        "id": str(uuid.uuid4()),
        "title": title,
        "completed": bool(body.get("completed", False)),
    }

    try:
        TABLE.put_item(Item=item)
    except ClientError as e:
        return _resp(500, {"message": "DynamoDB error", "error": str(e)})

    return _resp(201, item)


def list_todos(event, context):
    if TABLE is None:
        return _resp(500, {"message": "Server misconfigured: TODOS_TABLE not set"})
    try:
        resp = TABLE.scan()
        items = resp.get("Items", [])
        return _resp(200, items)
    except ClientError as e:
        return _resp(500, {"message": "DynamoDB error", "error": str(e)})


def update_todo(event, context):
    if TABLE is None:
        return _resp(500, {"message": "Server misconfigured: TODOS_TABLE not set"})
    todo_id = event.get("pathParameters", {}).get("id")
    if not todo_id:
        return _resp(400, {"message": "Missing path parameter: id"})

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _resp(400, {"message": "Invalid JSON body"})

    update_expr = []
    expr_attr_vals = {}
    expr_attr_names = {}

    if "title" in body:
        update_expr.append("#t = :title")
        expr_attr_vals[":title"] = body["title"]
        expr_attr_names["#t"] = "title"

    if "completed" in body:
        update_expr.append("completed = :completed")
        expr_attr_vals[":completed"] = bool(body["completed"])

    if not update_expr:
        return _resp(400, {"message": "No updatable fields provided (title, completed)"})

    try:
        resp = TABLE.update_item(
            Key={"id": todo_id},
            UpdateExpression="SET " + ", ".join(update_expr),
            ExpressionAttributeValues=expr_attr_vals,
            ExpressionAttributeNames=expr_attr_names if expr_attr_names else None,
            ReturnValues="ALL_NEW",
        )
        attributes = resp.get("Attributes", {})
        return _resp(200, attributes)
    except ClientError as e:
        return _resp(500, {"message": "DynamoDB error", "error": str(e)})


def delete_todo(event, context):
    if TABLE is None:
        return _resp(500, {"message": "Server misconfigured: TODOS_TABLE not set"})
    todo_id = event.get("pathParameters", {}).get("id")
    if not todo_id:
        return _resp(400, {"message": "Missing path parameter: id"})

    try:
        TABLE.delete_item(Key={"id": todo_id})
        return _resp(204, {"message": "Deleted"})
    except ClientError as e:
        return _resp(500, {"message": "DynamoDB error", "error": str(e)})
