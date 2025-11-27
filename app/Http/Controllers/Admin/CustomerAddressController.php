<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Address;
use Illuminate\Http\Request;

class CustomerAddressController extends Controller
{
    public function index(User $user)
    {
        return response()->json([
            'user' => $user->only(['id', 'name', 'email']),
            'addresses' => $user->addresses()->orderByDesc('is_default')->orderBy('id')->get(),
        ]);
    }

    public function store(Request $request, User $user)
    {
        $data = $request->validate([
            'label' => ['nullable','string','max:100'],
            'recipient_name' => ['nullable','string','max:150'],
            'phone' => ['nullable','string','max:50'],
            'province' => ['nullable','string','max:100'],
            'city' => ['nullable','string','max:100'],
            'district' => ['nullable','string','max:100'],
            'postal_code' => ['nullable','string','max:20'],
            'address_line1' => ['required','string','max:255'],
            'address_line2' => ['nullable','string','max:255'],
            'latitude' => ['nullable','numeric'],
            'longitude' => ['nullable','numeric'],
            'is_default' => ['nullable','boolean'],
        ]);

        $isDefault = (bool)($data['is_default'] ?? false);
        if ($isDefault) {
            Address::where('user_id', $user->id)->update(['is_default' => false]);
        }

        $address = $user->addresses()->create($data);
        return response()->json($address, 201);
    }

    public function setDefault(User $user, Address $address)
    {
        abort_unless($address->user_id === $user->id, 404);
        Address::where('user_id', $user->id)->update(['is_default' => false]);
        $address->update(['is_default' => true]);
        return response()->json(['message' => 'Default address updated']);
    }

    public function destroy(User $user, Address $address)
    {
        abort_unless($address->user_id === $user->id, 404);
        $address->delete();
        return response()->json(['message' => 'Address deleted']);
    }
}
