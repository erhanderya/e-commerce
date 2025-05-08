package com.webapp.back_end.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.webapp.back_end.model.Address;
import com.webapp.back_end.model.User;
import com.webapp.back_end.repository.AddressRepository;
import jakarta.transaction.Transactional;
import java.util.List;

@Service
public class AddressService {

    private final AddressRepository addressRepository;

    @Autowired
    public AddressService(AddressRepository addressRepository) {
        this.addressRepository = addressRepository;
    }

    public List<Address> getUserAddresses(User user) {
        return addressRepository.findByUserOrderByIsDefaultDesc(user);
    }

    public Address getAddressById(Long addressId, User user) {
        Address address = addressRepository.findById(addressId)
            .orElseThrow(() -> new RuntimeException("Address not found"));
        
        if (!address.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("You don't have permission to access this address");
        }
        
        return address;
    }

    @Transactional
    public Address createAddress(Address address, User user) {
        address.setUser(user);
        
        // If this is the first address or set as default
        if (address.isDefault()) {
            resetDefaultAddresses(user);
        } else {
            // If this is the first address, make it default anyway
            List<Address> existingAddresses = addressRepository.findByUser(user);
            if (existingAddresses.isEmpty()) {
                address.setDefault(true);
            }
        }
        
        return addressRepository.save(address);
    }

    @Transactional
    public Address updateAddress(Long addressId, Address addressDetails, User user) {
        Address address = getAddressById(addressId, user);
        
        address.setFullName(addressDetails.getFullName());
        address.setPhone(addressDetails.getPhone());
        address.setStreet(addressDetails.getStreet());
        address.setCity(addressDetails.getCity());
        address.setState(addressDetails.getState());
        address.setPostalCode(addressDetails.getPostalCode());
        address.setCountry(addressDetails.getCountry());
        
        // If setting as default
        if (!address.isDefault() && addressDetails.isDefault()) {
            resetDefaultAddresses(user);
            address.setDefault(true);
        }
        
        return addressRepository.save(address);
    }

    @Transactional
    public void deleteAddress(Long addressId, User user) {
        Address address = getAddressById(addressId, user);
        addressRepository.delete(address);
        
        // If default address was deleted, set another one as default if available
        if (address.isDefault()) {
            List<Address> remainingAddresses = addressRepository.findByUser(user);
            if (!remainingAddresses.isEmpty()) {
                Address newDefault = remainingAddresses.get(0);
                newDefault.setDefault(true);
                addressRepository.save(newDefault);
            }
        }
    }

    @Transactional
    public Address setDefaultAddress(Long addressId, User user) {
        Address address = getAddressById(addressId, user);
        
        resetDefaultAddresses(user);
        address.setDefault(true);
        
        return addressRepository.save(address);
    }

    private void resetDefaultAddresses(User user) {
        List<Address> userAddresses = addressRepository.findByUser(user);
        userAddresses.forEach(a -> {
            if (a.isDefault()) {
                a.setDefault(false);
                addressRepository.save(a);
            }
        });
    }
}