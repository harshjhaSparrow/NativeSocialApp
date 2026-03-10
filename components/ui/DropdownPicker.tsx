import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, TouchableWithoutFeedback } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';

interface DropdownPickerProps {
    value: string;
    options: string[];
    onSelect: (val: string) => void;
    placeholder?: string;
}

export default function DropdownPicker({ value, options, onSelect, placeholder = "Select an option" }: DropdownPickerProps) {
    const [visible, setVisible] = useState(false);

    return (
        <>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => setVisible(true)}>
                <Text style={value ? styles.pickerText : styles.pickerPlaceholder}>
                    {value || placeholder}
                </Text>
                <ChevronDown size={20} color="#64748b" />
            </TouchableOpacity>

            <Modal visible={visible} transparent animationType="fade">
                <TouchableWithoutFeedback onPress={() => setVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>{placeholder}</Text>
                                </View>
                                <FlatList
                                    data={options}
                                    keyExtractor={(item) => item}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.optionBtn}
                                            onPress={() => {
                                                onSelect(item);
                                                setVisible(false);
                                            }}
                                        >
                                            <Text style={[styles.optionText, value === item && styles.optionTextSelected]}>
                                                {item}
                                            </Text>
                                            {value === item && <Check size={20} color="#3b82f6" />}
                                        </TouchableOpacity>
                                    )}
                                    style={styles.list}
                                />
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setVisible(false)}>
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    pickerBtn: {
        backgroundColor: '#0f172a',
        borderWidth: 2,
        borderColor: '#1e293b',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    pickerText: { color: '#fff', fontSize: 16, fontWeight: '500' },
    pickerPlaceholder: { color: '#64748b', fontSize: 16 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#0f172a',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 32,
        maxHeight: '80%',
    },
    modalHeader: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
        alignItems: 'center',
    },
    modalTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    list: { paddingHorizontal: 16, paddingVertical: 8 },
    optionBtn: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
    },
    optionText: { color: '#cbd5e1', fontSize: 16 },
    optionTextSelected: { color: '#3b82f6', fontWeight: 'bold' },
    cancelBtn: {
        marginTop: 16,
        marginHorizontal: 16,
        backgroundColor: '#1e293b',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
