package com.smartsplit.smartsplit;

import static org.junit.jupiter.api.Assertions.*;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.Test;

public class BillTest {

    @Test
    void addPersonWorks() {
        Bill bill = new Bill();

        Person person = bill.addPerson("Rayyan");

        assertNotNull(person);
        assertEquals("Rayyan", person.getName());
        assertEquals(1, bill.getPeople().size());
    }

    @Test
    void duplicatePersonIsRejected() {
        Bill bill = new Bill();

        bill.addPerson("Rayyan");

        assertThrows(IllegalArgumentException.class, () -> {
            bill.addPerson("Rayyan");
        });
    }

    @Test
    void blankPersonNameIsRejected() {
        Bill bill = new Bill();

        assertThrows(IllegalArgumentException.class, () -> {
            bill.addPerson("   ");
        });
    }

    @Test
    void addItemWorks() {
        Bill bill = new Bill();

        Item item = bill.addItem("Pizza", new BigDecimal("30.00"));

        assertNotNull(item);
        assertEquals("Pizza", item.getItem());
        assertEquals(new BigDecimal("30.00"), item.getPrice());
    }

    @Test
    void invalidItemPriceIsRejected() {
        Bill bill = new Bill();

        assertThrows(IllegalArgumentException.class, () -> {
            bill.addItem("Pizza", new BigDecimal("0"));
        });
    }

    @Test
    void itemShareIsCalculatedCorrectly() {
        Bill bill = new Bill();

        Person rayyan = bill.addPerson("Rayyan");
        Person ahmed = bill.addPerson("Ahmed");

        Item pizza = bill.addItem("Pizza", new BigDecimal("30.00"));

        bill.shareItem(rayyan, pizza);
        bill.shareItem(ahmed, pizza);

        assertEquals(
            new BigDecimal("15.0000000000"),
            pizza.calculateShare()
        );
    }

    @Test
    void personTotalIsCalculatedCorrectly() {
        Bill bill = new Bill();

        Person rayyan = bill.addPerson("Rayyan");
        Person ahmed = bill.addPerson("Ahmed");

        Item pizza = bill.addItem("Pizza", new BigDecimal("30.00"));
        Item coke = bill.addItem("Coke", new BigDecimal("6.00"));

        bill.shareItem(rayyan, pizza);
        bill.shareItem(ahmed, pizza);
        bill.shareItem(rayyan, coke);

        assertEquals(
            new BigDecimal("21.0000000000"),
            bill.personTotal(rayyan)
        );

        assertEquals(
            new BigDecimal("15.0000000000"),
            bill.personTotal(ahmed)
        );
    }

    @Test
    void taxIsDistributedProportionally() {
        Bill bill = new Bill();

        Person rayyan = bill.addPerson("Rayyan");
        Person ahmed = bill.addPerson("Ahmed");

        Item pizza = bill.addItem("Pizza", new BigDecimal("30.00"));
        Item burger = bill.addItem("Burger", new BigDecimal("10.00"));

        bill.shareItem(rayyan, pizza);
        bill.shareItem(ahmed, burger);

        bill.addTax(new BigDecimal("4.00"));

        
        assertEquals(
        		new BigDecimal("33.000000000000"),
        		bill.billTotal(rayyan)
        		);

        assertEquals(
            new BigDecimal("11.000000000000"),
            bill.billTotal(ahmed)
        );
    }

    @Test
    void tipIsSplitEqually() {
        Bill bill = new Bill();

        Person rayyan = bill.addPerson("Rayyan");
        Person ahmed = bill.addPerson("Ahmed");

        Item pizza = bill.addItem("Pizza", new BigDecimal("30.00"));

        bill.shareItem(rayyan, pizza);
        bill.shareItem(ahmed, pizza);

        bill.addTip(new BigDecimal("6.00"));

        assertEquals(
            new BigDecimal("18.0000000000"),
            bill.unroundedFinalTotal(rayyan)
        );

        assertEquals(
            new BigDecimal("18.0000000000"),
            bill.unroundedFinalTotal(ahmed)
        );
    }

    @Test
    void negativeTaxIsRejected() {
        Bill bill = new Bill();

        assertThrows(IllegalArgumentException.class, () -> {
            bill.addTax(new BigDecimal("-1.00"));
        });
    }

    @Test
    void negativeTipIsRejected() {
        Bill bill = new Bill();

        assertThrows(IllegalArgumentException.class, () -> {
            bill.addTip(new BigDecimal("-1.00"));
        });
    }

    @Test
    void negativePaymentIsRejected() {
        Person person = new Person("Rayyan");

        assertThrows(IllegalArgumentException.class, () -> {
            person.paid(new BigDecimal("-10.00"));
        });
    }

    @Test
    void finalTotalsAreCalculatedAndRounded() {
        Bill bill = new Bill();

        Person rayyan = bill.addPerson("Rayyan");
        Person ahmed = bill.addPerson("Ahmed");
        Person ali = bill.addPerson("Ali");

        Item pizza = bill.addItem("Pizza", new BigDecimal("30.00"));
        Item burger = bill.addItem("Burger", new BigDecimal("12.00"));
        Item coke = bill.addItem("Coke", new BigDecimal("6.00"));

        bill.shareItem(rayyan, pizza);
        bill.shareItem(ahmed, pizza);

        bill.shareItem(ahmed, burger);
        bill.shareItem(ali, burger);

        bill.shareItem(rayyan, coke);

        bill.addTax(new BigDecimal("4.00"));
        bill.addTip(new BigDecimal("6.00"));

        bill.calculateFinalTotals();

        assertEquals(
            new BigDecimal("24.75"),
            rayyan.getFinalTotal()
        );

        assertEquals(
            new BigDecimal("24.75"),
            ahmed.getFinalTotal()
        );

        assertEquals(
            new BigDecimal("8.50"),
            ali.getFinalTotal()
        );
    }

    @Test
    void balanceIsCalculatedCorrectly() {
        Bill bill = new Bill();

        Person rayyan = bill.addPerson("Rayyan");
        Person ahmed = bill.addPerson("Ahmed");

        rayyan.setFinalTotal(new BigDecimal("20.00"));
        ahmed.setFinalTotal(new BigDecimal("30.00"));

        rayyan.paid(new BigDecimal("25.00"));
        ahmed.paid(new BigDecimal("20.00"));

        assertEquals(
            new BigDecimal("5.00"),
            bill.balance(rayyan)
        );

        assertEquals(
            new BigDecimal("-10.00"),
            bill.balance(ahmed)
        );
    }

    @Test
    void settlementCreatesCorrectTransactions() {
        Bill bill = new Bill();

        Person rayyan = bill.addPerson("Rayyan");
        Person ahmed = bill.addPerson("Ahmed");
        Person ali = bill.addPerson("Ali");

        rayyan.setFinalTotal(new BigDecimal("24.75"));
        ahmed.setFinalTotal(new BigDecimal("24.75"));
        ali.setFinalTotal(new BigDecimal("8.50"));

        rayyan.paid(new BigDecimal("30.00"));
        ahmed.paid(new BigDecimal("20.00"));
        ali.paid(new BigDecimal("8.00"));

        List<SettlementTransaction> transactions = bill.clearing();

        assertEquals(2, transactions.size());

        assertEquals("Ahmed", transactions.get(0).getFrom());
        assertEquals("Rayyan", transactions.get(0).getTo());
        assertEquals(
            new BigDecimal("4.75"),
            transactions.get(0).getAmount()
        );

        assertEquals("Ali", transactions.get(1).getFrom());
        assertEquals("Rayyan", transactions.get(1).getTo());
        assertEquals(
            new BigDecimal("0.50"),
            transactions.get(1).getAmount()
        );
    }

    @Test
    void sharingSameItemTwiceIsRejected() {
        Bill bill = new Bill();

        Person rayyan = bill.addPerson("Rayyan");
        Item pizza = bill.addItem("Pizza", new BigDecimal("30.00"));

        bill.shareItem(rayyan, pizza);

        assertThrows(IllegalArgumentException.class, () -> {
            bill.shareItem(rayyan, pizza);
        });
    }

    @Test
    void sharingPersonNotInBillIsRejected() {
        Bill bill = new Bill();

        Person rayyan = new Person("Rayyan");
        Item pizza = bill.addItem("Pizza", new BigDecimal("30.00"));

        assertThrows(IllegalArgumentException.class, () -> {
            bill.shareItem(rayyan, pizza);
        });
    }
}