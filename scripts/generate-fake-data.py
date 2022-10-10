#!/usr/bin/env python3

# requirements:
# pip install names random-word

# usage: python path-to-this-file.py
# outputs: data.json (in current folder)
# Wait patiently because it might take some time


import names
import json
import random
from random_word import RandomWords
from itertools import chain

rand_word = RandomWords()


def generate_entry():
    first_name = names.get_first_name()
    last_name = names.get_last_name()
    name = f"{first_name} {last_name}"
    email = f"{first_name}@{last_name}.example"
    return {"name": name, "email": email}


def generate_category(max_depth, children_cnt, prefix):
    if children_cnt == 0 or max_depth <= 1:
        return [[*prefix, rand_word.get_random_word()]]
    depth = random.randint(1, max_depth - 1)
    next_children_cnt = random.randint(0, children_cnt - 1)
    cat_name = rand_word.get_random_word()
    subcats = (
        generate_category(depth, next_children_cnt, [*prefix, cat_name]) for _ in range(children_cnt)
    )
    flatten = chain(*subcats)
    result = [[*prefix, cat_name], *flatten]
    print(result)
    return result


def assign_categories_to_entries(entries, categories, max_cat_cnt):
    for entry in entries:
        cat_cnt = random.randint(0, max_cat_cnt)
        entry["categories"] = [random.choice(
            categories) for _ in range(cat_cnt)]


def generate(entries_len, cat_root_cnt, max_depth, children_cnt, max_contact_cat_cnt):
    contacts = [generate_entry() for _ in range(entries_len)]
    categories = list(chain.from_iterable(generate_category(
        max_depth, children_cnt, []) for _ in range(cat_root_cnt)))
    print(categories)
    assign_categories_to_entries(contacts, categories, max_contact_cat_cnt)
    return contacts


if __name__ == "__main__":
    with open("data.json", "w") as f:
        json.dump(generate(200, 6, 5, 4, 3), f, indent=2)
