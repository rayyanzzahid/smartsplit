package com.smartsplit.smartsplit;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;

@Entity
public class Item {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String itemname;
    private BigDecimal price;
    private int quantity;

    @ManyToMany
    private List<Person> people;

    @ManyToOne
    private Bill bill;

    public Item(String itemname, BigDecimal price, int quantity) {
        this.itemname = itemname;
        this.price = price;
        this.quantity = quantity;
        people = new ArrayList<>();
    }

    protected Item() {
    }

    public String getItem() {
        return itemname;
    }

    public void setItem(String itemname) {
        this.itemname = itemname;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public void whoshared(Person person) {
        people.add(person);
    }

    public void unsharePerson(Person person) {
        people.remove(person);
    }

    public BigDecimal calculateShare() {

        if (people.size() == 0) {
            throw new IllegalArgumentException("Item has no one sharing it");
        }

        BigDecimal count = BigDecimal.valueOf(people.size());

        BigDecimal totalPrice =
                price.multiply(BigDecimal.valueOf(quantity));

        return totalPrice.divide(count, 10, RoundingMode.HALF_UP);
    }

    public boolean checkItem(Person person) {
        return people.contains(person);
    }

    public void setBill(Bill bill) {
        this.bill = bill;
    }

    public Long getId() {
        return id;
    }

    public List<Person> getPeople() {
        return people;
    }
}
