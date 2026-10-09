# SmartSplit

SmartSplit is a bill-splitting REST API built with Java and Spring Boot.

It allows users to create a bill, add people and items, split items between people, calculate tax and tip, record payments, calculate balances, and generate settlement transactions.

## Features

- Create bills
- Add people to a bill
- Add items and prices
- Split items between multiple people
- Calculate each person's share
- Distribute tax proportionally
- Split tip equally
- Record payments
- Calculate final totals
- Calculate balances
- Generate settlement transactions
- View a complete bill summary
- Store data using PostgreSQL

## Technologies

- Java 21
- Spring Boot
- Spring Data JPA
- PostgreSQL
- Maven
- JUnit
- REST API
- Git / GitHub

## Project Structure

The project follows an object-oriented design with separate classes for:

- `Bill`
- `Person`
- `Item`
- `SettlementTransaction`

Spring Boot controllers handle HTTP requests, while the domain classes contain the bill-splitting logic.

## Example

For example, if:

- Rayyan pays £30 and owes £24.75
- Ahmed pays £20 and owes £24.75
- Ali pays £8 and owes £8.50

The settlement can calculate:

```text
Ahmed → Rayyan: £4.75
Ali → Rayyan: £0.50
